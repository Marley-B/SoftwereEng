import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Keyboard,
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
import { resolvePhotonLangFromEnvironment } from "../photonPlaces";
import type { Route, RouteDraft } from "../types";
import { PlaceAutocompleteField } from "./PlaceAutocompleteField";
import { RouteEndpointsMap } from "./RouteEndpointsMap";
import { formatRouteTime, parseRouteTime } from "../routeTimeUtils";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const SHEET_MAX_HEIGHT = Math.round(WINDOW_HEIGHT * 0.94);

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

// ─── Time picker popup modal ──────────────────────────────────────────────────

interface TimePickerModalProps {
  label: string;
  onConfirm: (date: Date) => void;
  onDismiss: () => void;
  value: Date;
  visible: boolean;
}

function TimePickerModal({
  label,
  onConfirm,
  onDismiss,
  value,
  visible,
}: TimePickerModalProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  if (!visible) return null;

  return (
    <View style={pickerStyles.overlay}>
      <Pressable
        accessibilityRole="button"
        onPress={onDismiss}
        style={pickerStyles.backdrop}
      />
      <View style={pickerStyles.centeredOuter} pointerEvents="box-none">
        <View style={pickerStyles.card}>
          <Text style={pickerStyles.cardTitle}>{label}</Text>

          <View style={pickerStyles.wheelWrapper}>
            <DateTimePicker
              display="spinner"
              mode="time"
              textColor="#000000"
              themeVariant="light"
              value={draft}
              onChange={(_, date) => {
                if (date) setDraft(date);
              }}
              style={pickerStyles.wheel}
            />
          </View>

          <View style={pickerStyles.actions}>
            <View style={pickerStyles.actionBtn}>
              <AuthGhostButton label="Cancel" onPress={onDismiss} />
            </View>
            <View style={pickerStyles.actionBtn}>
              <AuthPrimaryButton
                label="Confirm"
                onPress={() => onConfirm(draft)}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  actionBtn: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: authTheme.space.sm,
    marginTop: authTheme.space.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  card: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.screen,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: authTheme.space.lg,
    width: "100%",
  },
  cardTitle: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.title,
    fontWeight: "800",
    marginBottom: authTheme.space.sm,
    textAlign: "center",
  },
  centeredOuter: {
    alignItems: "center",
    alignSelf: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    maxWidth: 400,
    paddingHorizontal: authTheme.space.md,
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  wheelWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: authTheme.radii.control,
    overflow: "hidden",
    width: "100%",
  },
});

// ─── Time field row (tappable display) ───────────────────────────────────────

interface TimeFieldProps {
  label: string;
  onPress: () => void;
  value: Date;
}

function TimeField({ label, onPress, value }: TimeFieldProps) {
  return (
    <View style={styles.timeBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.timeTouchable,
          pressed ? styles.timeTouchablePressed : null,
        ]}
      >
        <Text style={styles.timeTouchableText}>{formatRouteTime(value)}</Text>
        <Text style={styles.timeHint}>Tap to change</Text>
      </Pressable>
    </View>
  );
}

// ─── Main form modal ──────────────────────────────────────────────────────────

export function RouteFormModal({
  editingRoute,
  onDismiss,
  onSubmit,
  visible,
}: RouteFormModalProps) {
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
    if (!visible) return;

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
      expectedArrival = formatRouteTime(parseRouteTime(webArrival, defaultMorning()));
    } else {
      startTime = formatRouteTime(startDate);
      expectedArrival = formatRouteTime(arrivalDate);
    }

    onSubmit(
      { departure: trimmedDep, destination: trimmedDest, expectedArrival, name: trimmedName, startTime },
      editingRoute?.id ?? null,
    );
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardRoot}
      >
        <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.backdrop} />
        <View style={styles.sheetOuter} pointerEvents="box-none">
          <View style={styles.sheet}>
            <Pressable onPress={Keyboard.dismiss} style={styles.sheetTitleArea}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                {title}
              </Text>
            </Pressable>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              onScrollBeginDrag={Keyboard.dismiss}
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
                onSelect={(label, coords) => {
                  setDeparture(label);
                  if (coords) setDepCoords(coords);
                }}
                placeholder="Search any address worldwide"
                value={departure}
              />
              <PlaceAutocompleteField
                label="Destination"
                photonLang={photonLang}
                onSelect={(label, coords) => {
                  setDestination(label);
                  if (coords) setDestCoords(coords);
                }}
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
                  <TimeField
                    label="Start time"
                    onPress={() => setActivePicker("start")}
                    value={startDate}
                  />
                  <TimeField
                    label="Expected arrival"
                    onPress={() => setActivePicker("arrival")}
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

      {/* Time picker popups — inside this Modal so they render on top of it */}
      <TimePickerModal
        label="Start time"
        onConfirm={(date) => {
          setStartDate(date);
          setActivePicker(null);
        }}
        onDismiss={() => setActivePicker(null)}
        value={startDate}
        visible={activePicker === "start"}
      />
      <TimePickerModal
        label="Expected arrival"
        onConfirm={(date) => {
          setArrivalDate(date);
          setActivePicker(null);
        }}
        onDismiss={() => setActivePicker(null)}
        value={arrivalDate}
        visible={activePicker === "arrival"}
      />
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
    flex: 1,
    maxHeight: SHEET_MAX_HEIGHT,
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
  sheetTitleArea: {
    width: "100%",
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
