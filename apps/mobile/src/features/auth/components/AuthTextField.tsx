import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { authTheme } from "../theme";

interface AuthTextFieldProps extends TextInputProps {
  error?: string | null;
  label: string;
}

export function AuthTextField({
  error,
  label,
  style,
  ...rest
}: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        placeholderTextColor={authTheme.colors.placeholder}
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.caption,
    marginTop: authTheme.space.xs,
  },
  input: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.body,
    minHeight: 52,
    paddingHorizontal: authTheme.space.md,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
  },
  inputError: {
    borderColor: authTheme.colors.dangerMuted,
  },
  inputFocused: {
    borderColor: authTheme.colors.primary,
  },
  label: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "600",
    marginBottom: authTheme.space.xs,
  },
  wrap: {
    width: "100%",
  },
});
