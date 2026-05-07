import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthNavigator } from "./features/auth/AuthNavigator";
import {
  MockAuthProvider,
  useMockAuth,
} from "./features/auth/context/MockAuthProvider";
import { DisruptionsProvider } from "./features/disruptions/context/DisruptionsProvider";
import { HomeScreen } from "./screens/HomeScreen";

function Root() {
  const { user } = useMockAuth();

  return (
    <View style={styles.screen}>
      {user ? <HomeScreen /> : <AuthNavigator />}
    </View>
  );
}

export function App() {
  return (
    <SafeAreaProvider>
      <MockAuthProvider>
        <DisruptionsProvider>
          <Root />
        </DisruptionsProvider>
      </MockAuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
