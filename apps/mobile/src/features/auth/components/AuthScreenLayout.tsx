import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authTheme } from "../theme";

interface AuthScreenLayoutProps {
  /** Extra bottom inset for home indicator + comfortable thumb zone */
  bottomInset?: number;
  children: ReactNode;
}

export function AuthScreenLayout({
  bottomInset = authTheme.space.xl,
  children,
}: AuthScreenLayoutProps) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  inner: {
    alignSelf: "center",
    gap: authTheme.space.lg,
    maxWidth: 480,
    paddingHorizontal: authTheme.space.lg,
    width: "100%",
  },
  safe: {
    backgroundColor: authTheme.colors.background,
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    paddingTop: authTheme.space.md,
  },
});
