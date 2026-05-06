import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { authTheme } from "../theme";

interface AuthPrimaryButtonProps {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}

export function AuthPrimaryButton({
  disabled,
  label,
  loading,
  onPress,
}: AuthPrimaryButtonProps) {
  const inactive = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        inactive ? styles.primaryDisabled : null,
        pressed && !inactive ? styles.primaryPressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={authTheme.colors.onPrimary} />
      ) : (
        <Text style={styles.primaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

interface AuthGhostButtonProps {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}

export function AuthGhostButton({
  disabled,
  label,
  onPress,
}: AuthGhostButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ghost,
        pressed ? styles.ghostPressed : null,
      ]}
    >
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

interface AuthFooterLinkProps {
  emphasis: string;
  leading: string;
  onPress: () => void;
}

/** Compact inline link row for switching auth modes */
export function AuthFooterLink({
  emphasis,
  leading,
  onPress,
}: AuthFooterLinkProps) {
  return (
    <View style={styles.footerRow}>
      <Text style={styles.footerLeading}>{leading}</Text>
      <Pressable
        accessibilityHint={`Opens ${emphasis}`}
        accessibilityRole="button"
        hitSlop={10}
        onPress={onPress}
      >
        <Text style={styles.footerEmphasis}>{emphasis}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footerEmphasis: {
    color: authTheme.colors.primary,
    fontSize: authTheme.typography.caption,
    fontWeight: "700",
  },
  footerLeading: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  ghost: {
    alignItems: "center",
    borderRadius: authTheme.radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: authTheme.space.sm,
  },
  ghostLabel: {
    color: authTheme.colors.primary,
    fontSize: authTheme.typography.label,
    fontWeight: "600",
  },
  ghostPressed: {
    opacity: 0.75,
  },
  primary: {
    alignItems: "center",
    backgroundColor: authTheme.colors.primary,
    borderRadius: authTheme.radii.control,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: authTheme.space.lg,
  },
  primaryDisabled: {
    opacity: 0.45,
  },
  primaryLabel: {
    color: authTheme.colors.onPrimary,
    fontSize: authTheme.typography.body,
    fontWeight: "700",
  },
  primaryPressed: {
    backgroundColor: authTheme.colors.primaryPressed,
  },
});
