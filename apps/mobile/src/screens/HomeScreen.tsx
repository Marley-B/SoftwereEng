import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthGhostButton } from "../features/auth/components/AuthButtons";
import { useMockAuth } from "../features/auth/context/MockAuthProvider";
import { authTheme } from "../features/auth/theme";
import { RouteListItem } from "../features/routes/components/RouteListItem";
import { useRoutes } from "../features/routes/useRoutes";
import type { Route } from "../features/routes/types";

export function HomeScreen() {
  const { signOut, user } = useMockAuth();
  const { routes, isLoading, error, refetch } = useRoutes();

  const onEdit = useCallback((route: Route) => {
    Alert.alert("Edit route", `Edit “${route.name}” when the editor is ready.`);
  }, []);

  const onDelete = useCallback((route: Route) => {
    Alert.alert(
      "Delete route",
      `Remove “${route.name}”? This will call the API once it exists.`,
      [
        { style: "cancel", text: "Cancel" },
        { style: "destructive", text: "Delete" },
      ],
    );
  }, []);

  const renderListHeader = useCallback(
    () => (
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text accessibilityRole="header" style={styles.title}>
            Your routes
          </Text>
          <Text style={styles.subtitle}>
            Tap a route to see details and actions.
          </Text>
        </View>
        <AuthGhostButton label="Sign out" onPress={() => void signOut()} />
      </View>
    ),
    [signOut],
  );

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.inner}>
        {error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetch()}
              style={({ pressed }) => [
                styles.retry,
                pressed ? styles.retryPressed : null,
              ]}
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={isLoading ? [] : routes}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.listEmptyFill}>
                  <ActivityIndicator
                    color={authTheme.colors.primary}
                    size="large"
                  />
                  <Text style={styles.hint}>Loading routes…</Text>
                </View>
              ) : (
                <Text style={styles.empty}>No routes yet.</Text>
              )
            }
            ListHeaderComponent={renderListHeader}
            renderItem={({ item }) => (
              <RouteListItem
                onDelete={onDelete}
                onEdit={onEdit}
                route={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flexGrow: 1,
    gap: authTheme.space.md,
    justifyContent: "center",
    paddingVertical: authTheme.space.xl,
  },
  listEmptyFill: {
    alignItems: "center",
    flexGrow: 1,
    gap: authTheme.space.md,
    justifyContent: "center",
    minHeight: 280,
    paddingVertical: authTheme.space.xl,
  },
  empty: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.body,
    paddingVertical: authTheme.space.lg,
    textAlign: "center",
  },
  errorText: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.body,
    textAlign: "center",
  },
  hint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
  },
  inner: {
    alignSelf: "center",
    flex: 1,
    maxWidth: 480,
    paddingHorizontal: authTheme.space.lg,
    width: "100%",
  },
  listContent: {
    flexGrow: 1,
    gap: authTheme.space.sm,
    paddingBottom: authTheme.space.xl,
  },
  retry: {
    alignItems: "center",
    backgroundColor: authTheme.colors.primary,
    borderRadius: authTheme.radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: authTheme.space.lg,
  },
  retryLabel: {
    color: authTheme.colors.onPrimary,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
  },
  retryPressed: {
    backgroundColor: authTheme.colors.primaryPressed,
  },
  safe: {
    backgroundColor: authTheme.colors.background,
    flex: 1,
  },
  subtitle: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.body,
    lineHeight: 22,
    marginTop: authTheme.space.xs,
  },
  title: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.title,
    fontWeight: "800",
  },
  titleBlock: {
    flex: 1,
    paddingRight: authTheme.space.sm,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: authTheme.space.sm,
    justifyContent: "space-between",
    paddingTop: authTheme.space.sm,
  },
});
