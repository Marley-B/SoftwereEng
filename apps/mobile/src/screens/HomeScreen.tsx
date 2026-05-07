import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquareWarning } from 'lucide-react-native';

import { AuthPrimaryButton } from '../features/auth/components/AuthButtons';
import { useMockAuth } from '../features/auth/context/MockAuthProvider';
import { authTheme } from '../features/auth/theme';
import { useDisruptionsContext } from '../features/disruptions/context/DisruptionsProvider';
import { RouteFormModal } from '../features/routes/components/RouteFormModal';
import { RouteListItem } from '../features/routes/components/RouteListItem';
import { makeRouteId } from '../features/routes/makeRouteId';
import type { Route, RouteDraft } from '../features/routes/types';
import { useRoutes } from '../features/routes/useRoutes';
import { RouteDisruptionsScreen } from './RouteDisruptionsScreen';

export function HomeScreen() {
  const { signOut: _signOut, user } = useMockAuth();
  const { routes, isLoading, error, refetch, addRoute, updateRoute, deleteRoute } = useRoutes();
  const { disruptions } = useDisruptionsContext();

  const [formVisible, setFormVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [showDisruptions, setShowDisruptions] = useState(false);

  const disruptionCount = disruptions.length;

  const openAddRoute = useCallback(() => {
    setEditingRoute(null);
    setFormVisible(true);
  }, []);

  const openEditRoute = useCallback((route: Route) => {
    setEditingRoute(route);
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingRoute(null);
  }, []);

  const onSaveRoute = useCallback(
    (draft: RouteDraft, editingId: string | null) => {
      if (editingId) {
        updateRoute(editingId, draft);
      } else {
        addRoute({ ...draft, id: makeRouteId() });
      }
      closeForm();
    },
    [addRoute, closeForm, updateRoute],
  );

  const onDelete = useCallback(
    (route: Route) => {
      deleteRoute(route.id);
    },
    [deleteRoute],
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text accessibilityRole='header' style={styles.title}>
            Your routes
          </Text>
          <Text style={styles.subtitle}>Tap a route to see details and actions.</Text>
        </View>
        <Pressable
          accessibilityLabel={`Route disruptions, ${disruptionCount} active`}
          accessibilityRole='button'
          hitSlop={12}
          onPress={() => setShowDisruptions(true)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <MessageSquareWarning color={authTheme.colors.primary} size={24} strokeWidth={2} />
          {disruptionCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{disruptionCount > 99 ? '99+' : disruptionCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    ),
    [disruptionCount],
  );

  if (!user) {
    return null;
  }

  if (showDisruptions) {
    return <RouteDisruptionsScreen onBack={() => setShowDisruptions(false)} />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
      <View style={styles.column}>
        <RouteFormModal
          editingRoute={editingRoute}
          onDismiss={closeForm}
          onSubmit={onSaveRoute}
          visible={formVisible}
        />

        <View style={styles.inner}>
          {error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                accessibilityRole='button'
                onPress={() => void refetch()}
                style={({ pressed }) => [styles.retry, pressed ? styles.retryPressed : null]}
              >
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <FlatList
                contentContainerStyle={styles.listContent}
                data={isLoading ? [] : routes}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  isLoading ? (
                    <View style={styles.listEmptyFill}>
                      <ActivityIndicator color={authTheme.colors.primary} size='large' />
                      <Text style={styles.hint}>Loading routes…</Text>
                    </View>
                  ) : (
                    <Text style={styles.empty}>No routes yet.</Text>
                  )
                }
                ListHeaderComponent={renderListHeader}
                renderItem={({ item }) => <RouteListItem onDelete={onDelete} onEdit={openEditRoute} route={item} />}
                showsVerticalScrollIndicator={false}
                style={styles.listFlex}
              />
              {!isLoading ? (
                <View style={styles.footer}>
                  <AuthPrimaryButton label='Add route' onPress={openAddRoute} />
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    width: '100%',
  },
  centered: {
    alignItems: 'center',
    flexGrow: 1,
    gap: authTheme.space.md,
    justifyContent: 'center',
    paddingVertical: authTheme.space.xl,
  },
  listEmptyFill: {
    alignItems: 'center',
    flexGrow: 1,
    gap: authTheme.space.md,
    justifyContent: 'center',
    minHeight: 280,
    paddingVertical: authTheme.space.xl,
  },
  footer: {
    paddingBottom: authTheme.space.sm,
    paddingTop: authTheme.space.md,
  },
  empty: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.body,
    paddingVertical: authTheme.space.lg,
    textAlign: 'center',
  },
  errorText: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.body,
    textAlign: 'center',
  },
  hint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
  },
  inner: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 480,
    paddingHorizontal: authTheme.space.lg,
    width: '100%',
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    gap: authTheme.space.sm,
    paddingBottom: authTheme.space.xl,
  },
  retry: {
    alignItems: 'center',
    backgroundColor: authTheme.colors.primary,
    borderRadius: authTheme.radii.control,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: authTheme.space.lg,
  },
  retryLabel: {
    color: authTheme.colors.onPrimary,
    fontSize: authTheme.typography.label,
    fontWeight: '700',
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
    fontWeight: '800',
  },
  titleBlock: {
    flex: 1,
    paddingRight: authTheme.space.sm,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: authTheme.space.sm,
    justifyContent: 'space-between',
    paddingTop: authTheme.space.sm,
  },
  iconBtn: {
    alignItems: 'center',
    borderRadius: authTheme.radii.control,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  iconBtnPressed: {
    opacity: 0.6,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: authTheme.colors.danger,
    borderRadius: 10,
    bottom: 2,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 0,
  },
  badgeText: {
    color: authTheme.colors.onPrimary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 18,
  },
});
