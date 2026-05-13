import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AuthFooterLink,
  AuthGhostButton,
  AuthPrimaryButton,
} from "../components/AuthButtons";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { AuthTextField } from "../components/AuthTextField";
import { useAuth } from "../context/AuthProvider";
import { authTheme } from "../theme";
import { validateEmail, validatePassword } from "../validation";

interface SignInScreenProps {
  onBack?: () => void;
  onNeedAccount: () => void;
}

export function SignInScreen({ onBack, onNeedAccount }: SignInScreenProps) {
  const { isBusy, signIn, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    clearAuthError();
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) {
      return;
    }
    await signIn(email.trim(), password);
  }, [email, password, signIn, clearAuthError]);

  return (
    <AuthScreenLayout bottomInset={authTheme.space.lg}>
      <View style={styles.topBar}>
        {onBack && <AuthGhostButton disabled={isBusy} label="← Back" onPress={onBack} />}
      </View>

      <View style={{flex: 1}}>
        <Text accessibilityRole="header" style={styles.title}>
          Sign in
        </Text>
        <Text style={styles.subtitle}>Use the email you will use with Route Helper.</Text>
      </View>
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
          clearAuthError();
        }}
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />

      <AuthTextField
        autoCapitalize="none"
        autoComplete="password"
        error={passwordError}
        label="Password"
        onChangeText={(t) => {
          setPassword(t);
          setPasswordError(null);
          clearAuthError();
        }}
        placeholder="Your password"
        secureTextEntry
        textContentType="password"
        value={password}
      />

      {authError ? (
        <Text style={styles.authError}>{authError}</Text>
      ) : null}

      <AuthPrimaryButton
        disabled={isBusy}
        label="Continue"
        loading={isBusy}
        onPress={() => {
          void submit();
        }}
      />

      <AuthFooterLink
        emphasis="Create one"
        leading="No account yet?"
        onPress={onNeedAccount}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.body,
    lineHeight: 24,
    marginTop: authTheme.space.sm,
  },
  authError: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
    marginTop: authTheme.space.sm,
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
