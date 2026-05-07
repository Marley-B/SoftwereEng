import { useEffect, useState } from "react";
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
  fetchPhotonSuggestions,
  labelFromPhotonFeature,
} from "../photonPlaces";

interface PlaceAutocompleteFieldProps {
  label: string;
  photonLang: PhotonLang;
  onChangeText: (text: string) => void;
  placeholder?: string;
  value: string;
}

export function PlaceAutocompleteField({
  label,
  photonLang,
  onChangeText,
  placeholder,
  value,
}: PlaceAutocompleteFieldProps) {
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void fetchPhotonSuggestions(q, { lang: photonLang, signal: ac.signal })
        .then((features) => {
          setSuggestions(features);
        })
        .catch(() => {
          setSuggestions([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 380);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [value, photonLang]);

  const showList = focused && value.trim().length >= 2;

  /* Elevate while dropdown is open so lower fields don’t cover suggestions. */
  return (
    <View style={[styles.wrap, showList ? styles.wrapElevated : null]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityHint="Worldwide address search powered by OpenStreetMap"
          autoCapitalize="words"
          autoCorrect={false}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={authTheme.colors.placeholder}
          style={[
            styles.input,
            focused ? styles.inputFocused : null,
          ]}
          value={value}
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
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionsScroll}
          >
            {suggestions.length === 0 && !loading ? (
              <Text style={styles.emptyHint}>No matches — keep typing or refine.</Text>
            ) : null}
            {suggestions.map((feature, index) => {
              const line = labelFromPhotonFeature(feature);
              const key = `${line}-${index}`;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => {
                    onChangeText(line);
                    setFocused(false);
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
  emptyHint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    paddingHorizontal: authTheme.space.md,
    paddingVertical: authTheme.space.sm,
  },
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
