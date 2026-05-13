import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authTheme } from '../../auth/theme';
import type { Disruption } from '../types';

interface DisruptionListItemProps {
  disruption: Disruption;
  onDismiss: (id: string) => void | Promise<void>;
}

function formatOccurredAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function DisruptionListItem({ disruption, onDismiss }: DisruptionListItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.time}>{formatOccurredAt(disruption.occurredAt)}</Text>
      </View>

      <Text style={styles.description}>{disruption.description}</Text>

      {disruption.affectedRoutes.length > 0 ? (
        <View style={styles.routesRow}>
          <Text style={styles.routesLabel}>Affects: </Text>
          <Text style={styles.routesValue}>{disruption.affectedRoutes.join(', ')}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel='Dismiss disruption'
        accessibilityRole='button'
        hitSlop={8}
        onPress={() => void onDismiss(disruption.id)}
        style={({ pressed }) => [styles.dismissBtn, pressed && styles.dismissBtnPressed]}
      >
        <Text style={styles.dismissLabel}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: authTheme.space.sm,
    padding: authTheme.space.md,
  },
  description: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.body,
    lineHeight: 24,
  },
  dismissBtn: {
    alignItems: 'center',
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: 'center',
    marginTop: authTheme.space.xs,
    minHeight: 44,
    paddingHorizontal: authTheme.space.md,
  },
  dismissBtnPressed: {
    opacity: 0.7,
  },
  dismissLabel: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.label,
    fontWeight: '600',
  },
  dot: {
    backgroundColor: authTheme.colors.danger,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: authTheme.space.xs,
  },
  routesLabel: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: '600',
  },
  routesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  routesValue: {
    color: authTheme.colors.primary,
    flex: 1,
    fontSize: authTheme.typography.caption,
    fontWeight: '700',
  },
  time: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: '600',
  },
});
