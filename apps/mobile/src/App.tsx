import { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { AuthForm } from "./components/auth/AuthForm";
import { RoutesListScreen } from "./screens/RoutesListScreen";

type AppState = "auth" | "routes";

export function App() {
  const [appState, setAppState] = useState<AppState>("auth");

  if (appState === "routes") {
    return (
      <RoutesListScreen
        onSignOut={() => setAppState("auth")}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <AuthForm
        onSignIn={({ email }) => {
          setAppState("routes");
        }}
        onSignUp={({ email }) => {
          setAppState("routes");
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
