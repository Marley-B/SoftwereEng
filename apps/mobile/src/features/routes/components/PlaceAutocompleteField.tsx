import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { authTheme } from "../../auth/theme";
import {
  type PhotonFeature,
  type PhotonLang,
  coordsFromPhotonFeature,
  fetchPhotonSuggestions,
  labelFromPhotonFeature,
} from "../photonPlaces";

interface PlaceAutocompleteFieldProps {
  label: string;
  photonLang: PhotonLang;
  onSelect: (label: string, coords: { latitude: number; longitude: number } | null) => void;
  placeholder?: string;
  value: string;
}

export function PlaceAutocompleteField({
  label,
  photonLang,
  onSelect,
  placeholder,
  value,
}: PlaceAutocompleteFieldProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);

  // Set to true on suggestion touchstart so onBlur knows not to close the list.
  const suppressBlurRef = useRef(false);

  // Track current query in a ref so the value-sync effect can compare without
  // listing `query` as a dependency (which would cause it to run on every keystroke).
  const queryRef = useRef(query);
  queryRef.current = query;

  // Sync external resets (e.g. form clear) into local state.
  // Only fires when `value` differs from what the user has typed — not on
  // every echo-back from the parent after a keystroke.
  useEffect(() => {
    if (value !== queryRef.current) {
      setQuery(value);
      setSuggestions([]);
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounced Photon search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void fetchPhotonSuggestions(q, { lang: photonLang, signal: ac.signal })
        .then((features) => setSuggestions(features))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 380);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [query, photonLang]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    setOpen(true);
    onSelect(text, null);
  };

  const handleBlur = () => {
    // If the user is in the middle of pressing a suggestion, don't close yet —
    // handleSelectSuggestion will close it after committing the selection.
    if (suppressBlurRef.current) {
      return;
    }
    setOpen(false);
  };

  const handleSelectSuggestion = (feature: PhotonFeature) => {
    suppressBlurRef.current = false;
    const line = labelFromPhotonFeature(feature);
    const coords = coordsFromPhotonFeature(feature);
    setQuery(line);
    setSuggestions([]);
    setOpen(false);
    onSelect(line, coords);
  };

  const showList = open && query.trim().length >= 2 && suggestions.length > 0;

  return (
    <View style={[styles.wrap, showList ? styles.wrapElevated : null]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityHint="Worldwide address search powered by OpenStreetMap"
          autoCapitalize="words"
          autoCorrect={false}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (query.trim().length >= 2 && suggestions.length > 0) {
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={authTheme.colors.placeholder}
          style={[styles.input, open ? styles.inputFocused : null]}
          value={query}
        />
        {loading ? (
          <View style={styles.spinner}>
            <ActivityIndicator color={authTheme.colors.primary} size="small" />
          </View>
        ) : null}
      </View>

      {showList ? (
        <View style={styles.suggestionsWrap}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={styles.suggestionsScroll}
          >
            {suggestions.map((feature, index) => {
              const line = labelFromPhotonFeature(feature);
              const key = `${line}-${index}`;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  // onPressIn fires before the TextInput's onBlur, so we can
                  // set the flag in time to suppress the blur-close.
                  onPressIn={() => {
                    suppressBlurRef.current = true;
                  }}
                  onPress={() => handleSelectSuggestion(feature)}
                  // If the press is cancelled (e.g. user scrolls), reset the flag.
                  onPressOut={() => {
                    suppressBlurRef.current = false;
                  }}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    pressed ? styles.suggestionRowPressed : null,
                  ]}
                >
                  <Text style={styles.suggestionText}>{line}</Text>
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
  spinner: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    right: authTheme.space.sm,
    top: 0,
    width: 36,
  },
  suggestionRow: {
    borderBottomColor: authTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: authTheme.space.md,
    paddingVertical: authTheme.space.sm,
  },
  suggestionRowPressed: {
    backgroundColor: authTheme.colors.background,
  },
  suggestionText: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.body,
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
