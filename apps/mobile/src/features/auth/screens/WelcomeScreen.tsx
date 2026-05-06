import { StyleSheet, Text, View } from "react-native";

import { AuthGhostButton, AuthPrimaryButton } from "../components/AuthButtons";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { authTheme } from "../theme";

interface WelcomeScreenProps {
  onCreateAccount: () => void;
  onSignIn: () => void;
}

export function WelcomeScreen({
  onCreateAccount,
  onSignIn,
}: WelcomeScreenProps) {
  return (
    <AuthScreenLayout bottomInset={authTheme.space.xl}>
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.kicker}>
          Route Helper
        </Text>
        <Text style={styles.headline}>Plan rides without the friction</Text>
        <Text style={styles.body}>
          A calm, thumb-friendly sign-in flow. Wire your API here when it is
          ready — sessions are mocked in-memory for now.
        </Text>
      </View>

      <View style={styles.ctaColumn}>
        <AuthPrimaryButton label="Sign in" onPress={onSignIn} />
        <AuthGhostButton label="Create account" onPress={onCreateAccount} />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  body: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.body,
    lineHeight: 26,
  },
  ctaColumn: {
    gap: authTheme.space.sm,
    marginTop: authTheme.space.sm,
  },
  headline: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.headline,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  hero: {
    gap: authTheme.space.md,
    marginBottom: authTheme.space.sm,
  },
  kicker: {
    color: authTheme.colors.primary,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
