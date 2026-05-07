import { useCallback, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { authTheme } from "../../auth/theme";
import type { Route } from "../types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RouteListItemProps {
  onDelete: (route: Route) => void;
  onEdit: (route: Route) => void;
  route: Route;
}

function formatTimeframe(route: Route): string {
  return `${route.departure} – ${route.expectedArrival}`;
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  label: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
  },
  row: {
    gap: authTheme.space.xs,
  },
  value: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.body,
    fontWeight: "600",
  },
});

export function RouteListItem({ onDelete, onEdit, route }: RouteListItemProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, []);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityHint={
          expanded ? "Collapse route details" : "Expand route details"
        }
        accessibilityRole="button"
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerText}>
          <Text style={styles.name}>{route.name}</Text>
          <Text style={styles.timeframe}>{formatTimeframe(route)}</Text>
        </View>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.chevron}
        >
          {expanded ? "▾" : "▸"}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.details}>
          <DetailRow label="Start time" value={route.startTime} />
          <DetailRow label="Expected arrival" value={route.expectedArrival} />
          <DetailRow label="Departure" value={route.departure} />
          <DetailRow label="Destination" value={route.destination} />

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onEdit(route)}
              style={({ pressed }) => [
                styles.editBtn,
                pressed ? styles.editBtnPressed : null,
              ]}
            >
              <Text style={styles.editLabel}>Edit</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onDelete(route)}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed ? styles.deleteBtnPressed : null,
              ]}
            >
              <Text style={styles.deleteLabel}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: authTheme.space.sm,
    marginTop: authTheme.space.sm,
  },
  card: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  chevron: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.subhead,
    marginLeft: authTheme.space.sm,
  },
  deleteBtn: {
    alignItems: "center",
    borderColor: authTheme.colors.dangerMuted,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: authTheme.space.md,
  },
  deleteBtnPressed: {
    opacity: 0.85,
  },
  deleteLabel: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
  },
  details: {
    borderTopColor: authTheme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: authTheme.space.md,
    padding: authTheme.space.md,
    paddingTop: authTheme.space.md,
  },
  editBtn: {
    alignItems: "center",
    backgroundColor: authTheme.colors.primary,
    borderRadius: authTheme.radii.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: authTheme.space.md,
  },
  editBtnPressed: {
    backgroundColor: authTheme.colors.primaryPressed,
  },
  editLabel: {
    color: authTheme.colors.onPrimary,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: authTheme.space.md,
    paddingVertical: authTheme.space.md,
  },
  headerPressed: {
    backgroundColor: authTheme.colors.background,
  },
  headerText: {
    flex: 1,
    gap: authTheme.space.xs,
  },
  name: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.subhead,
    fontWeight: "800",
  },
  timeframe: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.body,
    fontWeight: "600",
  },
});
