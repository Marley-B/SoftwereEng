import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AuthGhostButton,
  AuthPrimaryButton,
} from "../../auth/components/AuthButtons";
import { AuthTextField } from "../../auth/components/AuthTextField";
import { authTheme } from "../../auth/theme";
import {
  geocodeFirstCoordinate,
  resolvePhotonLangFromEnvironment,
} from "../photonPlaces";
import type { Route, RouteDraft } from "../types";
import { PlaceAutocompleteField } from "./PlaceAutocompleteField";
import { RouteEndpointsMap } from "./RouteEndpointsMap";
import { formatRouteTime, parseRouteTime } from "../routeTimeUtils";

const WINDOW_HEIGHT = Dimensions.get("window").height;
/** Nearly full-screen sheet so form + map stay usable without excessive clipping. */
const SHEET_HEIGHT = Math.round(WINDOW_HEIGHT * 0.94);

interface RouteFormModalProps {
  editingRoute: Route | null;
  onDismiss: () => void;
  onSubmit: (draft: RouteDraft, editingId: string | null) => void;
  visible: boolean;
}

type ActivePicker = "arrival" | "start" | null;

function defaultMorning(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

interface NativeTimeFieldProps {
  active: boolean;
  label: string;
  onChange: (next: Date) => void;
  onClose: () => void;
  onOpen: () => void;
  value: Date;
}

function NativeTimeField({
  active,
  label,
  onChange,
  onClose,
  onOpen,
  value,
}: NativeTimeFieldProps) {
  const isAndroid = Platform.OS === "android";

  return (
    <View style={styles.timeBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.timeTouchable,
          pressed ? styles.timeTouchablePressed : null,
        ]}
      >
        <Text style={styles.timeTouchableText}>{formatRouteTime(value)}</Text>
        <Text style={styles.timeHint}>Tap to change</Text>
      </Pressable>
      {active ? (
        <View style={styles.pickerBlock}>
          <DateTimePicker
            display={isAndroid ? "default" : "spinner"}
            mode="time"
            value={value}
            onChange={(_, date) => {
              if (isAndroid) {
                onClose();
              }
              if (date) {
                onChange(date);
              }
            }}
          />
          {!isAndroid ? (
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.doneChip,
                pressed ? styles.doneChipPressed : null,
              ]}
            >
              <Text style={styles.doneChipLabel}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function RouteFormModal({
  editingRoute,
  onDismiss,
  onSubmit,
  visible,
}: RouteFormModalProps) {
  /** Stable per mount — tied to ICU/browser locale (Spanish → Photon `default`). */
  const [photonLang] = useState(resolvePhotonLangFromEnvironment);

  const [name, setName] = useState("");
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [depCoords, setDepCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destCoords, setDestCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [startDate, setStartDate] = useState(defaultMorning);
  const [arrivalDate, setArrivalDate] = useState(() => {
    const d = defaultMorning();
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [webStart, setWebStart] = useState("9:00");
  const [webArrival, setWebArrival] = useState("10:00");
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const morning = defaultMorning();
    const ten = defaultMorning();
    ten.setHours(10, 0, 0, 0);

    if (editingRoute) {
      setName(editingRoute.name);
      setDeparture(editingRoute.departure);
      setDestination(editingRoute.destination);
      setDepCoords(null);
      setDestCoords(null);
      setStartDate(parseRouteTime(editingRoute.startTime, morning));
      setArrivalDate(parseRouteTime(editingRoute.expectedArrival, ten));
      setWebStart(editingRoute.startTime);
      setWebArrival(editingRoute.expectedArrival);
    } else {
      setName("");
      setDeparture("");
      setDestination("");
      setDepCoords(null);
      setDestCoords(null);
      setStartDate(morning);
      setArrivalDate(ten);
      setWebStart(formatRouteTime(morning));
      setWebArrival(formatRouteTime(ten));
    }
    setActivePicker(null);
  }, [visible, editingRoute]);

  // Live map pins while typing — Photon resolves worldwide addresses (debounced).
  useEffect(() => {
    const q = departure.trim();
    if (q.length < 3) {
      setDepCoords(null);
      return;
    }
    const ac = new AbortController();
    const handle = setTimeout(() => {
      void geocodeFirstCoordinate(q, { lang: photonLang, signal: ac.signal }).then(
        setDepCoords,
      );
    }, 520);
    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [departure, photonLang]);

  useEffect(() => {
    const q = destination.trim();
    if (q.length < 3) {
      setDestCoords(null);
      return;
    }
    const ac = new AbortController();
    const handle = setTimeout(() => {
      void geocodeFirstCoordinate(q, { lang: photonLang, signal: ac.signal }).then(
        setDestCoords,
      );
    }, 520);
    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [destination, photonLang]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedDep = departure.trim();
    const trimmedDest = destination.trim();

    if (!trimmedName || !trimmedDep || !trimmedDest) {
      Alert.alert("Missing fields", "Please fill in every field before saving.");
      return;
    }

    let startTime: string;
    let expectedArrival: string;

    if (Platform.OS === "web") {
      const timeRe = /^(\d{1,2}):(\d{2})$/;
      if (!timeRe.test(webStart.trim()) || !timeRe.test(webArrival.trim())) {
        Alert.alert(
          "Invalid time",
          "Use 24-hour format like 9:00 or 14:30 for both times.",
        );
        return;
      }
      startTime = formatRouteTime(parseRouteTime(webStart, defaultMorning()));
      expectedArrival = formatRouteTime(
        parseRouteTime(webArrival, defaultMorning()),
      );
    } else {
      startTime = formatRouteTime(startDate);
      expectedArrival = formatRouteTime(arrivalDate);
    }

    const draft: RouteDraft = {
      departure: trimmedDep,
      destination: trimmedDest,
      expectedArrival,
      name: trimmedName,
      startTime,
    };

    onSubmit(draft, editingRoute?.id ?? null);
  };

  const title = editingRoute ? "Edit route" : "Add route";

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardRoot}
      >
        <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.backdrop} />
        <View style={styles.sheetOuter} pointerEvents="box-none">
          <View style={[styles.sheet, { height: SHEET_HEIGHT }]}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {title}
            </Text>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={styles.scrollFlex}
            >
              <AuthTextField
                autoCapitalize="words"
                label="Route name"
                onChangeText={setName}
                placeholder="e.g. Morning shuttle"
                value={name}
              />

              <PlaceAutocompleteField
                label="Departure"
                photonLang={photonLang}
                onChangeText={setDeparture}
                placeholder="Search any address worldwide"
                value={departure}
              />
              <PlaceAutocompleteField
                label="Destination"
                photonLang={photonLang}
                onChangeText={setDestination}
                placeholder="Search any address worldwide"
                value={destination}
              />

              <RouteEndpointsMap departure={depCoords} destination={destCoords} />

              {Platform.OS === "web" ? (
                <>
                  <AuthTextField
                    autoCapitalize="none"
                    label="Start time"
                    onChangeText={setWebStart}
                    placeholder="9:00"
                    value={webStart}
                  />
                  <AuthTextField
                    autoCapitalize="none"
                    label="Expected arrival"
                    onChangeText={setWebArrival}
                    placeholder="10:00"
                    value={webArrival}
                  />
                </>
              ) : (
                <>
                  <NativeTimeField
                    active={activePicker === "start"}
                    label="Start time"
                    onChange={setStartDate}
                    onClose={() => setActivePicker(null)}
                    onOpen={() => setActivePicker("start")}
                    value={startDate}
                  />
                  <NativeTimeField
                    active={activePicker === "arrival"}
                    label="Expected arrival"
                    onChange={setArrivalDate}
                    onClose={() => setActivePicker(null)}
                    onOpen={() => setActivePicker("arrival")}
                    value={arrivalDate}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.actions}>
              <View style={styles.actionGrow}>
                <AuthGhostButton label="Cancel" onPress={onDismiss} />
              </View>
              <View style={styles.actionGrow}>
                <AuthPrimaryButton
                  label={editingRoute ? "Save" : "Add route"}
                  onPress={handleSubmit}
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionGrow: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: authTheme.space.sm,
    marginTop: authTheme.space.sm,
    paddingTop: authTheme.space.sm,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  doneChip: {
    alignSelf: "flex-start",
    backgroundColor: authTheme.colors.primary,
    borderRadius: authTheme.radii.control,
    marginTop: authTheme.space.sm,
    paddingHorizontal: authTheme.space.md,
    paddingVertical: authTheme.space.sm,
  },
  doneChipLabel: {
    color: authTheme.colors.onPrimary,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
  },
  doneChipPressed: {
    backgroundColor: authTheme.colors.primaryPressed,
  },
  inputLabel: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "600",
    marginBottom: authTheme.space.xs,
  },
  keyboardRoot: {
    flex: 1,
    justifyContent: "center",
  },
  pickerBlock: {
    marginTop: authTheme.space.sm,
  },
  scrollContent: {
    flexGrow: 1,
    gap: authTheme.space.md,
    paddingBottom: authTheme.space.lg,
  },
  scrollFlex: {
    flex: 1,
  },
  sheet: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.screen,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
    padding: authTheme.space.lg,
    paddingBottom: authTheme.space.md,
    width: "100%",
  },
  sheetOuter: {
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    maxWidth: 520,
    paddingHorizontal: authTheme.space.md,
    width: "100%",
  },
  sheetTitle: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.title,
    fontWeight: "800",
    marginBottom: authTheme.space.sm,
  },
  timeBlock: {
    width: "100%",
  },
  timeHint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
    marginTop: 4,
  },
  timeTouchable: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: authTheme.space.md,
    paddingVertical: authTheme.space.md,
  },
  timeTouchablePressed: {
    backgroundColor: authTheme.colors.background,
  },
  timeTouchableText: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.body,
    fontWeight: "700",
  },
});
