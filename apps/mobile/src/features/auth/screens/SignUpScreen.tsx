import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AuthFooterLink,
  AuthPrimaryButton,
} from "../components/AuthButtons";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { AuthTextField } from "../components/AuthTextField";
import { useMockAuth } from "../context/MockAuthProvider";
import { authTheme } from "../theme";
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
} from "../validation";

interface SignUpScreenProps {
  onBack: () => void;
  onHaveAccount: () => void;
}

export function SignUpScreen({ onBack, onHaveAccount }: SignUpScreenProps) {
  const { isBusy, signUp } = useMockAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const nErr = validateDisplayName(displayName);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setNameError(nErr);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (nErr || eErr || pErr) {
      return;
    }
    await signUp(email.trim(), password, displayName.trim());
  }, [displayName, email, password, signUp]);

  return (
    <AuthScreenLayout bottomInset={authTheme.space.lg}>
      <Text accessibilityRole="header" style={styles.title}>
        Create account
      </Text>
      <Text style={styles.subtitle}>
        Eight-character minimum password.
      </Text>

      <AuthTextField
        autoCapitalize="words"
        autoComplete="name"
        error={nameError}
        label="Your name"
        onChangeText={(t) => {
          setDisplayName(t);
          setNameError(null);
        }}
        placeholder="Alex Rider"
        textContentType="name"
        value={displayName}
      />

      <AuthTextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={emailError}
        inputMode="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={(t) => {
          setEmail(t);
          setEmailError(null);
        }}
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />

      <AuthTextField
        autoCapitalize="none"
        autoComplete="password-new"
        error={passwordError}
        label="Password"
        onChangeText={(t) => {
          setPassword(t);
          setPasswordError(null);
        }}
        placeholder="At least 8 characters"
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />

      <AuthPrimaryButton
        disabled={isBusy}
        label="Create account"
        loading={isBusy}
        onPress={() => {
          void submit();
        }}
      />

      <AuthFooterLink
        emphasis="Sign in"
        leading="Already registered?"
        onPress={onHaveAccount}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.body,
    lineHeight: 24,
    marginTop: -authTheme.space.sm,
  },
  title: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.title,
    fontWeight: "800",
  },
  topBar: {
    alignSelf: "flex-start",
    marginBottom: authTheme.space.xs,
    marginHorizontal: -authTheme.space.xs,
  },
});
