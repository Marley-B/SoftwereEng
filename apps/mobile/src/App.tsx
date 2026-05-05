import { Alert, SafeAreaView, StyleSheet } from "react-native";

import { AuthForm } from "./components/auth/AuthForm";

export function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <AuthForm
        onSignIn={({ email }) => {
          Alert.alert("Sign in", `Signing in with ${email}`);
        }}
        onSignUp={({ email }) => {
          Alert.alert("Sign up", `Creating account for ${email}`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#f7f8fb",
    flex: 1,
  },
});
