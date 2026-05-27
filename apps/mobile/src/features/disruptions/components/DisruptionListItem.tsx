import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authTheme } from '../../auth/theme';
import type { Disruption } from '../types';

interface DisruptionListItemProps {
  disruption: Disruption;
  onDismiss: (id: string) => void | Promise<void>;
  onViewAlternatives?: (routeId: string | null, compact?: boolean) => void | Promise<void>;
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

function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function DisruptionListItem({ disruption, onDismiss, onViewAlternatives }: DisruptionListItemProps) {
  const suggestion = disruption.suggestedAlternative;

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

      {suggestion ? (
        <View style={styles.suggestionBox}>
          <Text style={styles.suggestionTitle}>Suggested alternative</Text>
          <Text style={styles.suggestionSummary}>{suggestion.summary}</Text>
          <Text style={styles.suggestionMeta}>
            {formatMinutes(suggestion.durationSeconds)}
            {suggestion.savingsSeconds > 0 ? ` · saves ${formatMinutes(suggestion.savingsSeconds)}` : ""}
          </Text>
          {suggestion.segments?.slice(0, 3).map((segment, index) => (
            <Text key={`${suggestion.id}-${index}`} style={styles.suggestionSegment}>
              {segment.modeLabel} · {segment.line}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        {disruption.routeId ? (
            <Pressable
              accessibilityLabel='View alternative routes'
              accessibilityRole='button'
              hitSlop={8}
              onPress={() => void onViewAlternatives?.(disruption.routeId, true)}
              style={({ pressed }) => [styles.altBtn, pressed && styles.altBtnPressed]}
            >
              <Text style={styles.altLabel}>View alternatives</Text>
            </Pressable>
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
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: authTheme.space.sm,
    marginTop: authTheme.space.sm,
  },
  altBtn: {
    alignItems: 'center',
    backgroundColor: authTheme.colors.primary,
    borderRadius: authTheme.radii.control,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: authTheme.space.md,
  },
  altBtnPressed: {
    opacity: 0.7,
  },
  altLabel: {
    color: authTheme.colors.onPrimary,
    fontSize: authTheme.typography.label,
    fontWeight: '700',
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
  suggestionBox: {
    backgroundColor: authTheme.colors.background,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: 4,
    padding: authTheme.space.sm,
  },
  suggestionMeta: {
    color: authTheme.colors.primary,
    fontSize: authTheme.typography.caption,
    fontWeight: '800',
  },
  suggestionSegment: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: '600',
  },
  suggestionSummary: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.body,
    fontWeight: '700',
  },
  suggestionTitle: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  time: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: '600',
  },
});
