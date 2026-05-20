import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, MessageSquareWarning } from 'lucide-react-native';

import { AuthPrimaryButton } from '../features/auth/components/AuthButtons';
import { useAuth } from '../features/auth/context/AuthProvider';
import { authTheme } from '../features/auth/theme';
import { useDisruptionsContext } from '../features/disruptions/context/DisruptionsProvider';
import { RouteDetectionDemo } from '../features/routes/components/RouteDetectionDemo';
import { RouteFormModal } from '../features/routes/components/RouteFormModal';
import { RouteListItem } from '../features/routes/components/RouteListItem';
import type { DetectedRouteDraft, Route, RouteCreateBody } from '../features/routes/types';
import { useRoutes } from '../features/routes/useRoutes';
import { registerExpoPushAndUpload } from '../lib/pushRegistration';
import { RouteDisruptionsScreen } from './RouteDisruptionsScreen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DropdownSectionProps {
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  subtitle?: string;
  title: string;
}

function DropdownSection({ children, expanded, onToggle, subtitle, title }: DropdownSectionProps) {
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole='button'
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.sectionHeaderPressed]}
      >
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        <Text
          accessibilityElementsHidden
          importantForAccessibility='no-hide-descendants'
          style={styles.sectionChevron}
        >
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>
      {expanded ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

interface HomeContentProps {
  children: React.ReactNode;
}

function HomeContent({ children }: HomeContentProps) {
  if (Platform.OS === 'web') {
    return <View style={styles.webPageContent}>{children}</View>;
  }
  return (
    <ScrollView
      contentContainerStyle={styles.pageContent}
      nestedScrollEnabled
      showsVerticalScrollIndicator
      style={styles.pageScroll}
    >
      {children}
    </ScrollView>
  );
}

export function HomeScreen() {
  const { signOut: _signOut, user } = useAuth();
  const { routes, isLoading, error, refetch, createRoute, updateRoute, deleteRoute } = useRoutes();
  const { disruptions } = useDisruptionsContext();

  const [formVisible, setFormVisible] = useState(false);
  const [detectedDraft, setDetectedDraft] = useState<DetectedRouteDraft | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [showDisruptions, setShowDisruptions] = useState(false);
  const [detectionExpanded, setDetectionExpanded] = useState(true);
  const [routesExpanded, setRoutesExpanded] = useState(true);

  const disruptionCount = disruptions.length;

  useEffect(() => {
    if (!user) {
      return;
    }
    void registerExpoPushAndUpload().catch(() => {
      /* optional - user may deny permission */
    });
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await _signOut();
  }, [_signOut]);

  const openAddRoute = useCallback(() => {
    setDetectedDraft(null);
    setEditingRoute(null);
    setFormVisible(true);
  }, []);

  const openEditRoute = useCallback((route: Route) => {
    setDetectedDraft(null);
    setEditingRoute(route);
    setFormVisible(true);
  }, []);

  const openDetectedDraft = useCallback((draft: DetectedRouteDraft) => {
    setEditingRoute(null);
    setDetectedDraft(draft);
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setDetectedDraft(null);
    setEditingRoute(null);
  }, []);

  const onSaveRoute = useCallback(
    async (body: RouteCreateBody, editingId: string | null) => {
      if (editingId) {
        await updateRoute(editingId, body);
      } else {
        await createRoute(body);
      }
      closeForm();
    },
    [createRoute, closeForm, updateRoute],
  );

  const onDelete = useCallback(
    (route: Route) => {
      void deleteRoute(route.id);
    },
    [deleteRoute],
  );

  const toggleDetection = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDetectionExpanded((value) => !value);
  }, []);

  const toggleRoutes = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRoutesExpanded((value) => !value);
  }, []);

  const renderSavedRoutes = () => {
    if (isLoading) {
      return (
        <View style={styles.listEmptyFill}>
          <ActivityIndicator color={authTheme.colors.primary} size='large' />
          <Text style={styles.hint}>Loading routes...</Text>
        </View>
      );
    }
    if (routes.length === 0) {
      return <Text style={styles.empty}>No routes yet.</Text>;
    }
    return routes.map((route) => (
      <RouteListItem key={route.id} onDelete={onDelete} onEdit={openEditRoute} route={route} />
    ));
  };

  if (!user) {
    return null;
  }

  if (showDisruptions) {
    return <RouteDisruptionsScreen onBack={() => setShowDisruptions(false)} />;
  }

  const savedRoutesSubtitle = `${routes.length} saved route${routes.length === 1 ? '' : 's'}. Tap a route for details.`;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
      <View style={styles.column}>
        <RouteFormModal
          detectedDraft={detectedDraft}
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
            <HomeContent>
              <View style={styles.topRow}>
                <Pressable
                  accessibilityLabel='Sign out'
                  accessibilityRole='button'
                  hitSlop={12}
                  onPress={() => void handleSignOut()}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                >
                  <LogOut color={authTheme.colors.primary} size={22} strokeWidth={2} />
                </Pressable>

                <View style={styles.titleBlock}>
                  <Text accessibilityRole='header' style={styles.title}>
                    Your routes
                  </Text>
                  <Text style={styles.subtitle}>Manage automatic detection and saved commutes.</Text>
                </View>

                <Pressable
                  accessibilityLabel={`Route disruptions, ${disruptionCount} active`}
                  accessibilityRole='button'
                  hitSlop={12}
                  onPress={() => setShowDisruptions(true)}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                >
                  {disruptionCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{disruptionCount > 99 ? '99+' : disruptionCount}</Text>
                    </View>
                  ) : null}
                  <MessageSquareWarning color={authTheme.colors.primary} size={24} strokeWidth={2} />
                </Pressable>
              </View>

              <DropdownSection
                expanded={detectionExpanded}
                onToggle={toggleDetection}
                title='Detected frequent routes'
              >
                <RouteDetectionDemo onSaveCandidate={openDetectedDraft} />
              </DropdownSection>

              <DropdownSection
                expanded={routesExpanded}
                onToggle={toggleRoutes}
                subtitle={savedRoutesSubtitle}
                title='Saved routes'
              >
                {renderSavedRoutes()}
              </DropdownSection>

              {!isLoading ? (
                <View style={styles.footer}>
                  <AuthPrimaryButton label='Add route' onPress={openAddRoute} />
                </View>
              ) : null}
            </HomeContent>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: authTheme.colors.danger,
    borderRadius: 10,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  badgeText: {
    color: authTheme.colors.onPrimary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 18,
  },
  centered: {
    alignItems: 'center',
    flexGrow: 1,
    gap: authTheme.space.md,
    justifyContent: 'center',
    paddingVertical: authTheme.space.xl,
  },
  column: {
    flex: 1,
    width: '100%',
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
  footer: {
    paddingBottom: authTheme.space.sm,
    paddingTop: authTheme.space.md,
  },
  hint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
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
  inner: {
    alignSelf: 'center',
    maxWidth: 480,
    paddingHorizontal: authTheme.space.lg,
    width: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as never } : { flex: 1 }),
  },
  listEmptyFill: {
    alignItems: 'center',
    flexGrow: 1,
    gap: authTheme.space.md,
    justifyContent: 'center',
    minHeight: 220,
    paddingVertical: authTheme.space.xl,
  },
  pageContent: {
    flexGrow: 1,
    gap: authTheme.space.sm,
    paddingBottom: authTheme.space.xl * 3,
  },
  pageScroll: {
    flex: 1,
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
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as never } : { flex: 1 }),
  },
  webPageContent: {
    gap: authTheme.space.sm,
    paddingBottom: authTheme.space.xl * 4,
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100vh' as never,
          overflow: 'visible' as never,
        }
      : {}),
  },
  section: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  sectionBody: {
    borderTopColor: authTheme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: authTheme.space.sm,
    padding: authTheme.space.md,
  },
  sectionChevron: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.subhead,
    fontWeight: '800',
    marginLeft: authTheme.space.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: authTheme.space.md,
  },
  sectionHeaderPressed: {
    backgroundColor: authTheme.colors.background,
  },
  sectionSubtitle: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: '600',
    lineHeight: 20,
  },
  sectionTitle: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.subhead,
    fontWeight: '800',
  },
  sectionTitleBlock: {
    flex: 1,
    gap: 4,
  },
  subtitle: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.body,
    lineHeight: 22,
  },
  title: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.title,
    fontWeight: '800',
  },
  titleBlock: {
    flex: 1,
    paddingHorizontal: authTheme.space.sm,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 0,
    justifyContent: 'space-between',
    paddingTop: authTheme.space.sm,
  },
});
