import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { PlaceRef } from "@route-helper/shared";
import type { PointerEvent as RNPointerEvent } from "react-native";

import { authTheme } from "../../auth/theme";
import { useAuth } from "../../auth/context/AuthProvider";
import { ApiError, apiRequest } from "../../../lib/apiClient";
import { newPlacesSessionToken } from "../placesSession";

interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface PlaceAutocompleteFieldProps {
  label: string;
  onSelect: (
    label: string,
    coords: { latitude: number; longitude: number } | null,
    place: PlaceRef | null,
  ) => void;
  placeholder?: string;
  value: string;
}

/** Web: keep focus on the input so mousedown on a row does not cancel the click / blur the field. */
function suggestionPointerDown(e: RNPointerEvent): void {
  if (Platform.OS !== "web") {
    return;
  }
  e.preventDefault();
}

export function PlaceAutocompleteField({
  label,
  onSelect,
  placeholder,
  value,
}: PlaceAutocompleteFieldProps) {
  const { user } = useAuth();
  const [fieldText, setFieldText] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);

  const suppressBlurRef = useRef(false);
  const selectingRef = useRef(false);
  const lastParentValueRef = useRef(value);
  /** While set, ignore parent `value` until it equals this string (avoids clobbering after pick). */
  const pendingCommitRef = useRef<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const sessionTokenRef = useRef(newPlacesSessionToken());

  useLayoutEffect(() => {
    if (pendingCommitRef.current !== null) {
      if (value === pendingCommitRef.current) {
        pendingCommitRef.current = null;
        lastParentValueRef.current = value;
      }
      return;
    }
    if (value !== lastParentValueRef.current) {
      lastParentValueRef.current = value;
      setFieldText(value);
    }
  }, [value]);

  useEffect(() => {
    const q = fieldText.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setSearchError(null);
      const params = new URLSearchParams({
        input: q,
        sessionToken: sessionTokenRef.current,
      });
      void apiRequest<{ suggestions: PlaceSuggestion[] }>(
        `/places/autocomplete?${params.toString()}`,
        { signal: ac.signal },
      )
        .then((res) => {
          if (cancelled) return;
          setSuggestions(res.suggestions ?? []);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setSuggestions([]);
          if (e instanceof ApiError) {
            const body = e.body as { error?: string } | null;
            setSearchError(
              typeof body?.error === "string" ? body.error : e.message,
            );
          } else {
            setSearchError("Could not load suggestions");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 380);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ac.abort();
    };
  }, [fieldText, user?.id]);

  const handleChangeText = (text: string) => {
    pendingCommitRef.current = null;
    setFieldText(text);
    setOpen(true);
    onSelect(text, null, null);
  };

  const handleBlur = () => {
    if (suppressBlurRef.current) {
      return;
    }
    setOpen(false);
  };

  const handleSelectSuggestion = async (s: PlaceSuggestion) => {
    selectingRef.current = true;
    suppressBlurRef.current = true;
    setDetailPlaceId(s.placeId);
    try {
      const params = new URLSearchParams({
        placeId: s.placeId,
        sessionToken: sessionTokenRef.current,
      });
      const res = await apiRequest<{ place: PlaceRef }>(
        `/places/details?${params.toString()}`,
      );
      const place = res.place;
      const line =
        (place.address && place.address.trim()) ||
        s.description ||
        [s.mainText, s.secondaryText].filter(Boolean).join(", ");

      pendingCommitRef.current = line;
      setFieldText(line);
      setSuggestions([]);
      setOpen(false);
      sessionTokenRef.current = newPlacesSessionToken();
      onSelect(line, { latitude: place.lat, longitude: place.lng }, place);

      // Some RN / web builds skip controlled updates — force native text.
      inputRef.current?.setNativeProps?.({ text: line });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? String((e.body as { error?: string } | null)?.error ?? e.message)
          : "Could not load place";
      Alert.alert("Places", msg);
    } finally {
      setDetailPlaceId(null);
      selectingRef.current = false;
      suppressBlurRef.current = false;
    }
  };

  const showDropdown =
    open && fieldText.trim().length >= 2 && suggestions.length > 0;
  const elevate =
    showDropdown ||
    (open && fieldText.trim().length >= 2 && loading) ||
    detailPlaceId !== null;

  return (
    <View style={[styles.wrap, elevate ? styles.wrapElevated : null]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          accessibilityHint="Address search powered by Google Maps"
          autoCapitalize="words"
          autoCorrect={false}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (fieldText.trim().length >= 2 && suggestions.length > 0) {
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={authTheme.colors.placeholder}
          style={[styles.input, open ? styles.inputFocused : null]}
          value={fieldText}
        />
        {loading || detailPlaceId ? (
          <View style={styles.spinner}>
            <ActivityIndicator color={authTheme.colors.primary} size="small" />
          </View>
        ) : null}
      </View>

      {searchError ? (
        <Text style={styles.searchError}>{searchError}</Text>
      ) : null}

      {showDropdown ? (
        <View style={styles.suggestionsWrap}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={styles.suggestionsScroll}
          >
            {suggestions.map((s, index) => {
              const key = `${s.placeId}-${index}`;
              const busy = detailPlaceId === s.placeId;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  disabled={detailPlaceId !== null}
                  onPointerDown={suggestionPointerDown}
                  onPressIn={() => {
                    suppressBlurRef.current = true;
                  }}
                  onPress={() => void handleSelectSuggestion(s)}
                  onPressOut={() => {
                    // Pressable may call onPressOut before onPress; defer so selectingRef is set first.
                    setTimeout(() => {
                      if (!selectingRef.current) {
                        suppressBlurRef.current = false;
                      }
                    }, 0);
                  }}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    pressed ? styles.suggestionRowPressed : null,
                    busy ? styles.suggestionRowBusy : null,
                  ]}
                >
                  <Text style={styles.suggestionMain}>{s.mainText}</Text>
                  {s.secondaryText ? (
                    <Text style={styles.suggestionSecondary}>{s.secondaryText}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    color: authTheme.colors.foreground,
    flex: 1,
    fontSize: authTheme.typography.body,
    minHeight: 52,
    paddingHorizontal: authTheme.space.md,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    paddingRight: 44,
  },
  inputFocused: {
    borderColor: authTheme.colors.primary,
  },
  inputRow: {
    position: "relative",
    width: "100%",
  },
  label: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "600",
    marginBottom: authTheme.space.xs,
  },
  searchError: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
    marginTop: authTheme.space.xs,
  },
  spinner: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    right: authTheme.space.sm,
    top: 0,
    width: 36,
  },
  suggestionMain: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.body,
    fontWeight: "600",
  },
  suggestionRow: {
    borderBottomColor: authTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: authTheme.space.md,
    paddingVertical: authTheme.space.sm,
  },
  suggestionRowBusy: {
    opacity: 0.55,
  },
  suggestionRowPressed: {
    backgroundColor: authTheme.colors.background,
  },
  suggestionSecondary: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    marginTop: 2,
  },
  suggestionsScroll: {
    maxHeight: 200,
  },
  suggestionsWrap: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginTop: authTheme.space.xs,
    overflow: "hidden",
  },
  wrap: {
    width: "100%",
    zIndex: 1,
  },
  wrapElevated: {
    zIndex: 30,
  },
});
