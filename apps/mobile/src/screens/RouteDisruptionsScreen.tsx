import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { authTheme } from '../features/auth/theme';
import { DisruptionListItem } from '../features/disruptions/components/DisruptionListItem';
import { useDisruptionsContext } from '../features/disruptions/context/DisruptionsProvider';

interface RouteDisruptionsScreenProps {
  onBack: () => void;
}

export function RouteDisruptionsScreen({ onBack }: RouteDisruptionsScreenProps) {
  const { disruptions, error, isLoading, refetch, dismiss } = useDisruptionsContext();

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
      <View style={styles.column}>
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.topRow}>
            <Pressable
              accessibilityLabel='Go back'
              accessibilityRole='button'
              hitSlop={12}
              onPress={onBack}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            >
              <ChevronLeft color={authTheme.colors.primary} size={22} strokeWidth={2.5} />
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.titleBlock}>
            <Text accessibilityRole='header' style={styles.title}>
              Route disruptions
            </Text>
            <Text style={styles.subtitle}>Live updates on service interruptions.</Text>
          </View>

          {/* Body */}
          {error ? (
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
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={isLoading ? [] : disruptions}
              keyExtractor={(item) => item.id}
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
  backBtn: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: authTheme.radii.control,
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: -authTheme.space.xs,
    minHeight: 44,
    paddingHorizontal: authTheme.space.xs,
    paddingVertical: authTheme.space.xs,
  },
  backBtnPressed: {
    opacity: 0.65,
  },
  backLabel: {
    color: authTheme.colors.primary,
    fontSize: authTheme.typography.label,
    fontWeight: '600',
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
    marginTop: authTheme.space.xs,
  },
  title: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.title,
    fontWeight: '800',
  },
  titleBlock: {
    paddingBottom: authTheme.space.md,
    paddingTop: authTheme.space.xs,
  },
  topRow: {
    paddingTop: authTheme.space.sm,
  },
});
