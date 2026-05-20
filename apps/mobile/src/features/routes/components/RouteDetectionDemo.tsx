import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Localization from "expo-localization";
import { MapPin, Route, Square } from "lucide-react-native";
import {
  detectRecurringRoutes,
  type DetectedRecurringRoute,
  type LocationSample,
} from "@route-helper/shared";

import { authTheme } from "../../auth/theme";
import { useRouteDetectionTracking } from "../locationTracking";

const home = { lat: 40.4168, lng: -3.7038 };
const work = { lat: 40.452, lng: -3.688 };

function stopSamples(
  center: { lat: number; lng: number },
  startIso: string,
  count = 4,
): LocationSample[] {
  const start = new Date(startIso).getTime();
  return Array.from({ length: count }, (_, index) => ({
    accuracyMeters: 20,
    lat: center.lat + index * 0.00003,
    lng: center.lng + index * 0.00003,
    recordedAt: new Date(start + index * 5 * 60 * 1000).toISOString(),
  }));
}

function demoSamples(): LocationSample[] {
  return [
    ...stopSamples(home, "2026-05-18T06:45:00.000Z"),
    ...stopSamples(work, "2026-05-18T07:35:00.000Z"),
    ...stopSamples(home, "2026-05-19T06:50:00.000Z"),
    ...stopSamples(work, "2026-05-19T07:42:00.000Z"),
    ...stopSamples(home, "2026-05-20T06:55:00.000Z"),
    ...stopSamples(work, "2026-05-20T07:46:00.000Z"),
  ];
}

function formatDays(days: string[]): string {
  return days.map((day) => day.slice(0, 3).toUpperCase()).join(", ");
}

function routeTitle(route: DetectedRecurringRoute): string {
  return `${route.typicalDepartureTime} -> ${route.typicalArrivalTime}`;
}

export function RouteDetectionDemo() {
  const [hasRun, setHasRun] = useState(false);
  const [showDemoData, setShowDemoData] = useState(false);
  const tracker = useRouteDetectionTracking();
  const userTimeZone = Localization.getCalendars()[0]?.timeZone ?? "UTC";
  const activeSamples = showDemoData ? demoSamples() : tracker.samples;
  const result = useMemo(
    () => detectRecurringRoutes(activeSamples, { timeZone: userTimeZone }),
    [activeSamples, userTimeZone],
  );
  const route = result.recurringRoutes[0];
  const canStop = tracker.isTracking || tracker.isBackgroundTracking;

  return (
    <View style={styles.panel}>
      <Text style={styles.description}>
        GPS tracking starts only after you enable it.
      </Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setShowDemoData(false);
            setHasRun(true);
            void tracker.startTracking();
          }}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <MapPin color={authTheme.colors.onPrimary} size={18} strokeWidth={2.4} />
          <Text style={styles.actionLabel}>Start GPS</Text>
        </Pressable>
        {Platform.OS !== "web" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setShowDemoData(false);
              setHasRun(true);
              void tracker.startBackgroundTracking();
            }}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
          >
            <MapPin color={authTheme.colors.primary} size={17} strokeWidth={2.4} />
            <Text style={styles.secondaryActionLabel}>Start background</Text>
          </Pressable>
        ) : null}
        {canStop ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void tracker.stopTracking()}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
          >
            <Square color={authTheme.colors.primary} size={16} strokeWidth={2.4} />
            <Text style={styles.secondaryActionLabel}>Stop</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setShowDemoData(true);
            setHasRun(true);
          }}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Route color={authTheme.colors.primary} size={17} strokeWidth={2.4} />
          <Text style={styles.secondaryActionLabel}>Use sample data</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setShowDemoData(false);
            tracker.clearSamples();
          }}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionLabel}>Clear</Text>
        </Pressable>
      </View>

      {hasRun ? (
        <View style={styles.result}>
          <Text style={styles.resultLine}>
            Source: {showDemoData ? "sample data" : "GPS"}
          </Text>
          <Text style={styles.resultLine}>Samples: {activeSamples.length}</Text>
          <Text style={styles.resultLine}>Stops found: {result.stops.length}</Text>
          <Text style={styles.resultLine}>Permission: {tracker.permissionStatus ?? "unknown"}</Text>
          {tracker.error ? <Text style={styles.errorLine}>{tracker.error}</Text> : null}
          {route ? (
            <>
              <Text style={styles.resultTitle}>Detected recurring route</Text>
              <Text style={styles.resultLine}>Trips found: {route.tripCount}</Text>
              <Text style={styles.resultLine}>Typical time: {routeTitle(route)}</Text>
              <Text style={styles.resultLine}>Days: {formatDays(route.daysOfWeek)}</Text>
              <Text style={styles.resultLine}>
                Confidence: {Math.round(route.confidence * 100)}%
              </Text>
            </>
          ) : (
            <Text style={styles.resultLine}>No recurring route found yet.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    backgroundColor: authTheme.colors.primary,
    borderRadius: authTheme.radii.control,
    flexDirection: "row",
    gap: authTheme.space.xs,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: authTheme.space.md,
  },
  actionLabel: {
    color: authTheme.colors.onPrimary,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
  },
  actionPressed: {
    backgroundColor: authTheme.colors.primaryPressed,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: authTheme.space.sm,
  },
  description: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
    lineHeight: 20,
  },
  panel: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: authTheme.space.sm,
    marginTop: authTheme.space.md,
    padding: authTheme.space.md,
  },
  errorLine: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.caption,
    fontWeight: "700",
  },
  result: {
    borderTopColor: authTheme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingTop: authTheme.space.sm,
  },
  resultLine: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
  },
  resultTitle: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "800",
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: "row",
    gap: authTheme.space.xs,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: authTheme.space.md,
  },
  secondaryActionLabel: {
    color: authTheme.colors.primary,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
  },
  secondaryActionPressed: {
    backgroundColor: authTheme.colors.background,
  },
});
