import { StyleSheet, View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthNavigator } from "./features/auth/AuthNavigator";
import { AuthProvider, useAuth } from "./features/auth/context/AuthProvider";
import { DisruptionsProvider } from "./features/disruptions/context/DisruptionsProvider";
import { HomeScreen } from "./screens/HomeScreen";

function Root() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator accessibilityLabel="Loading" size="large" />
      </View>
    );
  }

  return <View style={styles.screen}>{user ? <HomeScreen /> : <AuthNavigator />}</View>;
}

export function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DisruptionsProvider>
          <Root />
        </DisruptionsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  screen: {
    flex: 1,
  },
});
