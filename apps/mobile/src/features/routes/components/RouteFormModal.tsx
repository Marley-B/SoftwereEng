import DateTimePicker from "@react-native-community/datetimepicker";
import * as Localization from "expo-localization";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
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
import type { PlaceRef, TransitOption, TransitSnapshot } from "@route-helper/shared";
import {
  AuthGhostButton,
  AuthPrimaryButton,
} from "../../auth/components/AuthButtons";
import { AuthTextField } from "../../auth/components/AuthTextField";
import { authTheme } from "../../auth/theme";
import { ApiError, apiRequest } from "../../../lib/apiClient";
import type { Route } from "../types";
import type { DetectedRouteDraft, RouteCreateBody } from "../types";
import { PlaceAutocompleteField } from "./PlaceAutocompleteField";
import { RouteEndpointsMap } from "./RouteEndpointsMap";
import {
  formatRouteTime,
  parseRouteTime,
  scheduledCommuteWindowSeconds,
} from "../routeTimeUtils";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const SHEET_MAX_HEIGHT = Math.round(WINDOW_HEIGHT * 0.94);
const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface RouteFormModalProps {
  detectedDraft: DetectedRouteDraft | null;
  editingRoute: Route | null;
  compact?: boolean;
  onDismiss: () => void;
  onSubmit: (body: RouteCreateBody, editingId: string | null) => Promise<void>;
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
  wheel: {
    width: "100%",
    height: 200,
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
  detectedDraft,
  editingRoute,
  compact = false,
  onDismiss,
  onSubmit,
  visible,
}: RouteFormModalProps) {
  const [name, setName] = useState("");
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [depPlace, setDepPlace] = useState<PlaceRef | null>(null);
  const [destPlace, setDestPlace] = useState<PlaceRef | null>(null);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([...WEEKDAYS]);
  const [startDate, setStartDate] = useState(defaultMorning);
  const [arrivalDate, setArrivalDate] = useState(() => {
    const d = defaultMorning();
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [webStart, setWebStart] = useState("9:00");
  const [webArrival, setWebArrival] = useState("10:00");
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const [transitOptions, setTransitOptions] = useState<TransitOption[]>([]);
  const [pickedOption, setPickedOption] = useState<TransitOption | null>(null);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  /** Ignores stale HTTP responses when the user changes places or departure time quickly. */
  const transitFetchGen = useRef(0);

  const userTimeZone = Localization.getCalendars()[0]?.timeZone ?? "UTC";

  const depCoords = depPlace ? { latitude: depPlace.lat, longitude: depPlace.lng } : null;
  const destCoords = destPlace ? { latitude: destPlace.lat, longitude: destPlace.lng } : null;
  const selectedTransitPayload = pickedOption?.payload ?? editingRoute?.transitSnapshot?.selectedPayload ?? null;

  useEffect(() => {
    if (!visible) return;

    const morning = defaultMorning();
    const ten = defaultMorning();
    ten.setHours(10, 0, 0, 0);

    if (editingRoute) {
      setName(editingRoute.name);
      setDeparture(editingRoute.departure);
      setDestination(editingRoute.destination);
      setDepPlace(editingRoute.origin);
      setDestPlace(editingRoute.destinationPlace);
      setStartDate(parseRouteTime(editingRoute.startTime, morning));
      setArrivalDate(parseRouteTime(editingRoute.expectedArrival, ten));
      setWebStart(editingRoute.startTime);
      setWebArrival(editingRoute.expectedArrival);
      setDaysOfWeek(editingRoute.daysOfWeek ?? [...WEEKDAYS]);
    } else if (detectedDraft) {
      setName(detectedDraft.name);
      setDeparture(detectedDraft.departureLabel);
      setDestination(detectedDraft.destinationLabel);
      setDepPlace(detectedDraft.origin);
      setDestPlace(detectedDraft.destination);
      setStartDate(parseRouteTime(detectedDraft.startTime, morning));
      setArrivalDate(parseRouteTime(detectedDraft.expectedArrival, ten));
      setWebStart(detectedDraft.startTime);
      setWebArrival(detectedDraft.expectedArrival);
      setDaysOfWeek(detectedDraft.daysOfWeek);
    } else {
      setName("");
      setDeparture("");
      setDestination("");
      setDepPlace(null);
      setDestPlace(null);
      setStartDate(morning);
      setArrivalDate(ten);
      setWebStart(formatRouteTime(morning));
      setWebArrival(formatRouteTime(ten));
      setDaysOfWeek([...WEEKDAYS]);
    }
    setTransitOptions([]);
    setPickedOption(null);
    setTransitError(null);
    setActivePicker(null);
    // Use route id, not the whole object — avoids re-running when the parent recreates route DTOs.
  }, [visible, editingRoute?.id, detectedDraft?.id]);

  useEffect(() => {
    if (!editingRoute) return;
    if (pickedOption) return;
    if (!transitOptions || transitOptions.length === 0) return;
    const selectedId = editingRoute.transitSnapshot?.selectedOptionId;
    if (!selectedId) return;
    const match = transitOptions.find((o) => o.id === selectedId);
    if (match) {
      setPickedOption(match);
    }
  }, [transitOptions, editingRoute, pickedOption]);

  const departureInstant = useCallback((): Date => {
    if (Platform.OS === "web") {
      return parseRouteTime(webStart, new Date());
    }
    return startDate;
  }, [webStart, startDate]);

  const loadTransitOptions = useCallback(async () => {
    if (!depPlace || !destPlace) {
      return;
    }
    const gen = ++transitFetchGen.current;
    setTransitLoading(true);
    setTransitError(null);
    setPickedOption(null);
    setTransitOptions([]);
    try {
      const res = await apiRequest<{ options: TransitOption[] }>("/routes/transit-options", {
        method: "POST",
        json: {
          origin: depPlace,
          destination: destPlace,
          departureIso: departureInstant().toISOString(),
          timeZone: userTimeZone,
        },
      });
      if (transitFetchGen.current !== gen) {
        return;
      }
      setTransitOptions(res.options);
      if (res.options.length === 0) {
        setTransitError("No transit routes found. Try different times or places.");
      }
    } catch (e) {
      if (transitFetchGen.current !== gen) {
        return;
      }
      const msg =
        e instanceof ApiError
          ? ((e.body as { error?: string } | null)?.error ?? e.message)
          : "Could not load options";
      setTransitError(msg);
      setTransitOptions([]);
    } finally {
      if (transitFetchGen.current === gen) {
        setTransitLoading(false);
      }
    }
  }, [depPlace, destPlace, departureInstant, userTimeZone]);

  const departureTimeKey =
    Platform.OS === "web" ? webStart.trim() : String(startDate.getTime());

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (!depPlace || !destPlace) {
      setTransitOptions([]);
      setPickedOption(null);
      setTransitError(null);
      return;
    }
    const debounceMs = Platform.OS === "web" ? 500 : 0;
    if (debounceMs === 0) {
      void loadTransitOptions();
      return;
    }
    const id = setTimeout(() => {
      void loadTransitOptions();
    }, debounceMs);
    return () => clearTimeout(id);
  }, [visible, depPlace?.placeId, destPlace?.placeId, departureTimeKey, loadTransitOptions]);

  /** When a transit option is selected, it must not exceed start → expected arrival window. */
  const transitWindowViolationMessage = useMemo(() => {
    if (!pickedOption) {
      return null;
    }
    let startHHmm: string;
    let arrivalHHmm: string;
    if (Platform.OS === "web") {
      const timeRe = /^(\d{1,2}):(\d{2})$/;
      if (!timeRe.test(webStart.trim()) || !timeRe.test(webArrival.trim())) {
        return null;
      }
      const morning = defaultMorning();
      startHHmm = formatRouteTime(parseRouteTime(webStart, morning));
      arrivalHHmm = formatRouteTime(parseRouteTime(webArrival, morning));
    } else {
      startHHmm = formatRouteTime(startDate);
      arrivalHHmm = formatRouteTime(arrivalDate);
    }
    const windowSec = scheduledCommuteWindowSeconds(startHHmm, arrivalHHmm);
    if (windowSec === null || windowSec <= 0) {
      return "Expected arrival must be after your start time.";
    }
    if (pickedOption.durationSeconds > windowSec) {
      const tripMin = Math.ceil(pickedOption.durationSeconds / 60);
      const windowMin = Math.max(1, Math.floor(windowSec / 60));
      return `This trip takes about ${tripMin} min, but your start→arrival window is only ${windowMin} min. Allow more time or pick a shorter route.`;
    }
    return null;
  }, [pickedOption, webStart, webArrival, startDate, arrivalDate]);

  const handleSubmit = async () => {
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

    if (!depPlace || !destPlace) {
      Alert.alert("Places", "Pick departure and destination from suggestions so coordinates are set.");
      return;
    }

    if (pickedOption) {
      const windowSec = scheduledCommuteWindowSeconds(startTime, expectedArrival);
      if (windowSec === null || windowSec <= 0) {
        Alert.alert("Times", "Expected arrival must be after your start time.");
        return;
      }
      if (pickedOption.durationSeconds > windowSec) {
        const tripMin = Math.ceil(pickedOption.durationSeconds / 60);
        const windowMin = Math.max(1, Math.floor(windowSec / 60));
        Alert.alert(
          "Transit",
          `This trip takes about ${tripMin} min, but your start→arrival window is only ${windowMin} min. Allow more time or pick a shorter route.`,
        );
        return;
      }
    }

    let snapshot: TransitSnapshot | null = null;
    if (pickedOption) {
      snapshot = {
        optionsRequest: {
          departureIso: departureInstant().toISOString(),
          timeZone: userTimeZone,
        },
        selectedOptionId: pickedOption.id,
        selectedPayload: pickedOption.payload as Record<string, unknown>,
        baselineDurationSeconds: pickedOption.durationSeconds,
        ...(pickedOption.staticDurationSeconds !== undefined
          ? { baselineStaticDurationSeconds: pickedOption.staticDurationSeconds }
          : {}),
      };
    } else if (
      editingRoute &&
      depPlace.placeId === editingRoute.origin.placeId &&
      destPlace.placeId === editingRoute.destinationPlace.placeId &&
      startTime === editingRoute.startTime &&
      expectedArrival === editingRoute.expectedArrival
    ) {
      snapshot = editingRoute.transitSnapshot;
    }

    if (!snapshot) {
      Alert.alert(
        "Transit",
        "Select one of the transit routes listed under Public transit — or keep places and times unchanged from when you saved this route.",
      );
      return;
    }

    const body: RouteCreateBody = {
      name: trimmedName,
      startTime,
      expectedArrival,
      timeZone: userTimeZone,
      departureLabel: trimmedDep,
      destinationLabel: trimmedDest,
      origin: depPlace,
      destination: destPlace,
      transitSnapshot: snapshot,
      daysOfWeek: daysOfWeek as ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[],
    };

    setSaveBusy(true);
    try {
      await onSubmit(body, editingRoute?.id ?? null);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? ((e.body as { error?: string } | null)?.error ?? e.message)
          : "Save failed";
      Alert.alert("Could not save", msg);
    } finally {
      setSaveBusy(false);
    }
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
            {!compact ? (
              <Pressable onPress={Keyboard.dismiss} style={styles.sheetTitleArea}>
                <Text accessibilityRole="header" style={styles.sheetTitle}>
                  {title}
                </Text>
              </Pressable>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              onScrollBeginDrag={Keyboard.dismiss}
              showsVerticalScrollIndicator
              style={styles.scrollFlex}
            >
              {!compact ? (
                <>
                  <AuthTextField
                    autoCapitalize="words"
                    label="Route name"
                    onChangeText={setName}
                    placeholder="e.g. Morning shuttle"
                    value={name}
                  />

                  <PlaceAutocompleteField
                    label="Departure"
                    onSelect={(label, coords, place) => {
                      setDeparture(label);
                      if (coords && place) {
                        setDepPlace(place);
                      } else {
                        setDepPlace(null);
                      }
                    }}
                    placeholder="Search addresses (Google Maps)"
                    value={departure}
                  />
                  <PlaceAutocompleteField
                    label="Destination"
                    onSelect={(label, coords, place) => {
                      setDestination(label);
                      if (coords && place) {
                        setDestPlace(place);
                      } else {
                        setDestPlace(null);
                      }
                    }}
                    placeholder="Search addresses (Google Maps)"
                    value={destination}
                  />

                </>
              ) : (
                null
              )}

              {Platform.OS === "web" ? (
                <>
                  <AuthTextField
                    autoCapitalize="none"
                    label="Start time"
                    onChangeText={(t) => {
                      setWebStart(t);
                    }}
                    placeholder="9:00"
                    value={webStart}
                  />
                  <AuthTextField
                    autoCapitalize="none"
                    label="Expected arrival"
                    onChangeText={(t) => {
                      setWebArrival(t);
                    }}
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
              {!compact ? (
                <View style={styles.weekdaysBlock}>
                  <Text style={styles.weekdaysLabel}>Days of week:</Text>
                  <View style={styles.weekdaysRow}>
                    {WEEKDAYS.map((day) => (
                      <Pressable
                        key={day}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: daysOfWeek.includes(day) }}
                        onPress={() => {
                          setDaysOfWeek((prev) =>
                            prev.includes(day)
                              ? prev.filter((d) => d !== day)
                              : [...prev, day]
                          );
                        }}
                        style={[
                          styles.weekdayBox,
                          daysOfWeek.includes(day) && styles.weekdayBoxSelected,
                        ]}
                      >
                        <Text style={styles.weekdayText}>{day.slice(0, 3).toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              <View style={styles.selectedMapBlock}>
                <Text style={styles.selectedMapLabel}>Selected route preview</Text>
                <RouteEndpointsMap
                  departure={depCoords}
                  destination={destCoords}
                  transitPayload={selectedTransitPayload}
                />
              </View>
              <View style={styles.transitBlock}>
                <View style={styles.transitHeaderRow}>
                  <Text style={styles.transitTitle}>Transit options: </Text>
                  {depPlace && destPlace ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={transitLoading}
                      hitSlop={8}
                      onPress={() => void loadTransitOptions()}
                    >
                      <Text style={[styles.transitRefresh, transitLoading && styles.transitRefreshDisabled]}>
                        Refresh
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.transitHint}>
                  Routes appear automatically when both stops are set (using your start time). Tap a trip to
                  use it for disruption checks.
                </Text>
                {transitLoading ? (
                  <View style={styles.transitLoadingRow}>
                    <ActivityIndicator color={authTheme.colors.primary} />
                    <Text style={styles.transitLoadingLabel}>Finding routes…</Text>
                  </View>
                ) : null}
                {transitError ? <Text style={styles.transitErr}>{transitError}</Text> : null}
                {transitWindowViolationMessage ? (
                  <Text style={styles.transitErr}>{transitWindowViolationMessage}</Text>
                ) : null}
                {transitOptions.map((opt) => {
                  const selected = pickedOption?.id === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      accessibilityRole="button"
                      onPress={() => setPickedOption(opt)}
                      style={({ pressed }) => [
                        styles.optionRow,
                        selected && styles.optionRowSelected,
                        pressed && styles.optionRowPressed,
                      ]}
                    >
                      <Text style={styles.optionBullet}>{selected ? "●" : "○"}</Text>
                      <View style={styles.optionBody}>
                        <Text style={styles.optionDuration}>{opt.label}</Text>
                        {opt.segments?.map((seg, si) => (
                          <View key={`${opt.id}-seg-${si}`} style={styles.segmentBlock}>
                            <Text style={styles.segmentLine}>
                              <Text style={styles.segmentMode}>{seg.modeLabel}</Text>
                              {" · "}
                              {seg.line}
                            </Text>
                            {seg.detail ? (
                              <Text style={styles.segmentDetail}>{seg.detail}</Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {!compact ? (
              <View style={styles.actions}>
                <View style={styles.actionGrow}>
                  <AuthGhostButton label="Cancel" onPress={onDismiss} />
                </View>
                <View style={styles.actionGrow}>
                  <AuthPrimaryButton
                    disabled={Boolean(transitWindowViolationMessage)}
                    label={editingRoute ? "Save" : "Add route"}
                    loading={saveBusy}
                    onPress={() => void handleSubmit()}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                <View style={styles.actionGrow}>
                  <AuthPrimaryButton label="Close" onPress={onDismiss} />
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Time picker popups — inside this Modal so they render on top of it */}
      <TimePickerModal
        label="Start time"
        onConfirm={(date) => {
          setStartDate(date);
          setPickedOption(null);
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
          setPickedOption(null);
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
  selectedMapBlock: {
    gap: authTheme.space.xs,
    marginTop: authTheme.space.sm,
  },
  selectedMapLabel: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
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
  transitBlock: {
    gap: authTheme.space.sm,
    marginTop: authTheme.space.sm,
  },
  transitTitle: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.subhead,
    fontWeight: "800",
  },
  transitHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transitHint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
  },
  transitRefresh: {
    color: authTheme.colors.primary,
    fontSize: authTheme.typography.caption,
    fontWeight: "700",
  },
  transitRefreshDisabled: {
    opacity: 0.5,
  },
  transitLoadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: authTheme.space.sm,
    paddingVertical: authTheme.space.xs,
  },
  transitLoadingLabel: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
  },
  transitErr: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
  },
  optionRow: {
    alignItems: "flex-start",
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: "row",
    gap: authTheme.space.sm,
    paddingHorizontal: authTheme.space.md,
    paddingVertical: authTheme.space.sm,
  },
  optionRowPressed: {
    backgroundColor: authTheme.colors.background,
  },
  optionRowSelected: {
    borderColor: authTheme.colors.primary,
    backgroundColor: authTheme.colors.background,
  },
  optionBullet: {
    color: authTheme.colors.primary,
    fontSize: authTheme.typography.subhead,
    fontWeight: "800",
    marginTop: 2,
  },
  optionBody: {
    flex: 1,
    gap: 6,
  },
  optionDuration: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.body,
    fontWeight: "700",
  },
  segmentBlock: {
    gap: 2,
  },
  segmentLine: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
  },
  segmentMode: {
    color: authTheme.colors.foreground,
    fontWeight: "800",
  },
  segmentDetail: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
  },weekdaysBlock: {
  marginTop: authTheme.space.md,
  marginBottom: authTheme.space.sm,
},
weekdaysLabel: {
  color: authTheme.colors.foreground,
  fontSize: authTheme.typography.label,
  fontWeight: "600",
  marginBottom: authTheme.space.xs,
},
weekdaysRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: authTheme.space.xs,
  marginBottom: authTheme.space.xs,
},
weekdayBox: {
  borderColor: authTheme.colors.border,
  borderWidth: 1,
  borderRadius: authTheme.radii.control,
  paddingHorizontal: 10,
  paddingVertical: 6,
  marginRight: 4,
  marginBottom: 4,
  backgroundColor: authTheme.colors.surface,
},
weekdayBoxSelected: {
  backgroundColor: authTheme.colors.primary,
  borderColor: authTheme.colors.primary,
},
weekdayText: {
  color: authTheme.colors.foreground,
  fontWeight: "700",
},
});
