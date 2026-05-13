import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftFromLine } from 'lucide-react-native';

import { authTheme } from '../features/auth/theme';
import { DisruptionListItem } from '../features/disruptions/components/DisruptionListItem';
import { useDisruptionsContext } from '../features/disruptions/context/DisruptionsProvider';

interface RouteDisruptionsScreenProps {
  onBack: () => void;
}

export function RouteDisruptionsScreen({ onBack }: RouteDisruptionsScreenProps) {
  const { disruptions, error, isLoading, refetch, dismiss } = useDisruptionsContext();
  const [refreshing, setRefreshing] = useState(false);

  // Worker writes to the API DB; reload when this screen opens so new items appear.
  useEffect(() => {
    void refetch({ background: true });
  }, [refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch({ background: true });
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderListHeader = useCallback(
    () => (
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel='Go back'
          accessibilityRole='button'
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <ArrowLeftFromLine color={authTheme.colors.primary} size={22} strokeWidth={2} />
        </Pressable>

        <View style={styles.titleBlock}>
          <Text accessibilityRole='header' style={styles.title}>
            Route disruptions
          </Text>
          <Text style={styles.subtitle}>Live updates on service interruptions.</Text>
        </View>
      </View>
    ),
    [onBack],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
      <View style={styles.column}>
        <View style={styles.inner}>
          {error ? (
            <>
              {renderListHeader()}
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  accessibilityRole='button'
                  onPress={() => void refetch()}
                  style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
                >
                  <Text style={styles.retryLabel}>Try again</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={isLoading ? [] : disruptions}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  colors={[authTheme.colors.primary]}
                  onRefresh={() => void onRefresh()}
                  refreshing={refreshing}
                  tintColor={authTheme.colors.primary}
                />
              }
              ListEmptyComponent={
                isLoading ? (
                  <View style={styles.listEmptyFill}>
                    <ActivityIndicator color={authTheme.colors.primary} size='large' />
                    <Text style={styles.hint}>Loading disruptions…</Text>
                  </View>
                ) : (
                  <Text style={styles.empty}>No disruptions reported.</Text>
                )
              }
              ListHeaderComponent={renderListHeader}
              renderItem={({ item }) => <DisruptionListItem disruption={item} onDismiss={dismiss} />}
              showsVerticalScrollIndicator={false}
              style={styles.listFlex}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  listContent: {
    flexGrow: 1,
    gap: authTheme.space.sm,
    paddingBottom: authTheme.space.xl,
  },
  listEmptyFill: {
    alignItems: 'center',
    flexGrow: 1,
    gap: authTheme.space.md,
    justifyContent: 'center',
    minHeight: 280,
    paddingVertical: authTheme.space.xl,
  },
  listFlex: {
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
    flex: 1,
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
    padding: authTheme.space.xs,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: authTheme.space.sm,
  },
});
