import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type AuthValues = {
  email: string;
  password: string;
};

type AuthFormProps = {
  onSignIn?: (values: AuthValues) => void | Promise<void>;
  onSignUp?: (values: AuthValues) => void | Promise<void>;
  isLoading?: boolean;
};

export function AuthForm({
  onSignIn,
  onSignUp,
  isLoading = false,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"signIn" | "signUp" | null>(
    null,
  );

  const validateForm = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return "Please enter your email address.";
    }

    if (!password) {
      return "Please enter your password.";
    }

    return null;
  };

  const submit = async (action: "signIn" | "signUp") => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setActiveAction(action);

    const values = {
      email: email.trim(),
      password,
    };

    try {
      if (action === "signIn") {
        await onSignIn?.(values);
      } else {
        await onSignUp?.(values);
      }
    } finally {
      setActiveAction(null);
    }
  };

  const disabled = isLoading || activeAction !== null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Welcome</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#8a8f98"
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#8a8f98"
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={password}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <AuthButton
            disabled={disabled}
            isLoading={activeAction === "signIn" || isLoading}
            label="Sign In"
            onPress={() => submit("signIn")}
            variant="primary"
          />
          <AuthButton
            disabled={disabled}
            isLoading={activeAction === "signUp"}
            label="Sign Up"
            onPress={() => submit("signUp")}
            variant="secondary"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

type AuthButtonProps = {
  disabled: boolean;
  isLoading: boolean;
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
};

function AuthButton({
  disabled,
  isLoading,
  label,
  onPress,
  variant,
}: AuthButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        disabled ? styles.disabledButton : null,
        pressed && !disabled ? styles.pressedButton : null,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? "#ffffff" : "#2563eb"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isPrimary ? styles.primaryButtonText : styles.secondaryButtonText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  disabledButton: {
    opacity: 0.55,
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  form: {
    gap: 16,
    width: "100%",
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd5df",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  label: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  pressedButton: {
    opacity: 0.8,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderColor: "#2563eb",
  },
  secondaryButtonText: {
    color: "#2563eb",
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
  },
});


// cmd:  "D:\node.exe" ..\..\node_modules\expo\bin\cli start --web --clear