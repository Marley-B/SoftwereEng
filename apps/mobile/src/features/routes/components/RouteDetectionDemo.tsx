import { useEffect, useMemo, useState } from "react";
import { Alert, LayoutAnimation, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Localization from "expo-localization";
import * as Location from "expo-location";
import { MapPin, Route, Save, Square } from "lucide-react-native";
import {
  detectRecurringRoutes,
  type DetectedRecurringRoute,
  type LocationSample,
  type RouteDetectionResult,
} from "@route-helper/shared";

import { authTheme } from "../../auth/theme";
import { ApiError, apiRequest } from "../../../lib/apiClient";
import type { DetectedRouteDraft } from "../types";
import { useRouteDetectionTracking } from "../locationTracking";
import {
  notifyPotentialRouteDetected,
  resetDetectedRouteNotificationMemory,
  routeNotificationKey,
} from "../routeDetectionNotifications";
import { RouteEndpointsMap } from "./RouteEndpointsMap";

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

function routeNotificationMessage(route: DetectedRecurringRoute): string {
  return `${routeTitle(route)} on ${formatDays(route.daysOfWeek)}. Review it in Detected frequent routes.`;
}

function fallbackEndpointLabel(kind: "destination" | "origin", index: number): string {
  return kind === "origin" ? `Detected origin ${index + 1}` : `Detected destination ${index + 1}`;
}

function coordinateKey(endpoint: { lat: number; lng: number }): string {
  return `${endpoint.lat.toFixed(5)},${endpoint.lng.toFixed(5)}`;
}

function coordinateLabel(endpoint: { lat: number; lng: number }): string {
  return `${endpoint.lat.toFixed(5)}, ${endpoint.lng.toFixed(5)}`;
}

function routeAnalysisStatus(result: RouteDetectionResult): string {
  if (result.recurringRoutes.length > 0) {
    return "Route found";
  }
  if (result.stops.length < 2) {
    return "Needs another repeated place";
  }
  return "Needs a repeated start-to-end pattern";
}

function routeAnalysisStrength(result: RouteDetectionResult): string {
  if (result.recurringRoutes.length === 0) {
    return "Low";
  }
  const bestConfidence = Math.max(...result.recurringRoutes.map((route) => route.confidence));
  if (bestConfidence >= 0.75) {
    return "High";
  }
  if (bestConfidence >= 0.5) {
    return "Medium";
  }
  return "Low";
}

function AnalysisMetricRow({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "positive";
  value: string | number;
}) {
  return (
    <View style={styles.analysisMetricRow}>
      <Text style={styles.analysisMetricLabel}>{label}</Text>
      <Text style={[styles.analysisMetricValue, tone === "positive" && styles.analysisMetricValuePositive]}>
        {value}
      </Text>
    </View>
  );
}

function demoEndpointLabel(endpoint: { lat: number; lng: number }): string | null {
  const nearHome = Math.abs(endpoint.lat - home.lat) < 0.002 && Math.abs(endpoint.lng - home.lng) < 0.002;
  const nearWork = Math.abs(endpoint.lat - work.lat) < 0.002 && Math.abs(endpoint.lng - work.lng) < 0.002;
  if (nearHome) {
    return "Puerta del Sol, Madrid";
  }
  if (nearWork) {
    return "North Madrid office area";
  }
  return null;
}

function formatGeocodeAddress(address: Location.LocationGeocodedAddress): string | null {
  const parts = [
    address.name,
    address.street,
    address.city ?? address.district,
    address.region,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? [...new Set(parts)].join(", ") : null;
}

function toDetectedDraft(
  route: DetectedRecurringRoute,
  index: number,
  labels: { destinationLabel: string; originLabel: string },
): DetectedRouteDraft {
  return {
    daysOfWeek: route.daysOfWeek,
    departureLabel: labels.originLabel,
    destination: {
      address: labels.destinationLabel,
      lat: route.destination.lat,
      lng: route.destination.lng,
      placeId: `detected-destination-${route.destination.id}`,
    },
    destinationLabel: labels.destinationLabel,
    expectedArrival: route.typicalArrivalTime,
    id: `${route.origin.id}-${route.destination.id}-${index}`,
    name: `Detected route ${index + 1}`,
    origin: {
      address: labels.originLabel,
      lat: route.origin.lat,
      lng: route.origin.lng,
      placeId: `detected-origin-${route.origin.id}`,
    },
    startTime: route.typicalDepartureTime,
  };
}

interface DetectedRouteCardProps {
  expanded: boolean;
  index: number;
  onSave: (route: DetectedRecurringRoute, index: number, labels: { destinationLabel: string; originLabel: string }) => void;
  onToggle: () => void;
  route: DetectedRecurringRoute;
  labels: { destinationLabel: string; originLabel: string };
}

function DetectedRouteCard({ expanded, index, labels, onSave, onToggle, route }: DetectedRouteCardProps) {
  return (
    <View style={styles.routeCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.routeHeader, pressed && styles.routeHeaderPressed]}
      >
        <View style={styles.routeHeaderText}>
          <Text style={styles.routeName}>Detected route {index + 1}</Text>
          <Text style={styles.routeMeta}>{routeTitle(route)}</Text>
        </View>
        <Text style={styles.routeChevron}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.routeDetails}>
          <View style={styles.endpointBlock}>
            <Text style={styles.endpointLabel}>Start point</Text>
            <Text style={styles.endpointValue}>{labels.originLabel}</Text>
          </View>
          <View style={styles.endpointBlock}>
            <Text style={styles.endpointLabel}>End point</Text>
            <Text style={styles.endpointValue}>{labels.destinationLabel}</Text>
          </View>
          <RouteEndpointsMap
            departure={{ latitude: route.origin.lat, longitude: route.origin.lng }}
            destination={{ latitude: route.destination.lat, longitude: route.destination.lng }}
            transitPayload={null}
          />
          <Text style={styles.resultLine}>Trips found: {route.tripCount}</Text>
          <Text style={styles.resultLine}>Typical time: {routeTitle(route)}</Text>
          <Text style={styles.resultLine}>Days: {formatDays(route.daysOfWeek)}</Text>
          <Text style={styles.resultLine}>Confidence: {Math.round(route.confidence * 100)}%</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSave(route, index, labels)}
            style={({ pressed }) => [styles.saveAction, pressed && styles.saveActionPressed]}
          >
            <Save color={authTheme.colors.onPrimary} size={17} strokeWidth={2.4} />
            <Text style={styles.saveActionLabel}>Save as route</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

interface RouteDetectionDemoProps {
  onSaveCandidate: (draft: DetectedRouteDraft) => void;
}

export function RouteDetectionDemo({ onSaveCandidate }: RouteDetectionDemoProps) {
  const [hasRun, setHasRun] = useState(false);
  const [showDemoData, setShowDemoData] = useState(false);
  const [serverAnalysis, setServerAnalysis] = useState<{
    result: RouteDetectionResult;
    sampleCount: number;
  } | null>(null);
  const [serverAnalysisError, setServerAnalysisError] = useState<string | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [endpointLabels, setEndpointLabels] = useState<Record<string, string>>({});
  const tracker = useRouteDetectionTracking();
  const userTimeZone = Localization.getCalendars()[0]?.timeZone ?? "UTC";
  const activeSamples = showDemoData ? demoSamples() : tracker.samples;
  const result = useMemo(
    () => detectRecurringRoutes(activeSamples, { timeZone: userTimeZone }),
    [activeSamples, userTimeZone],
  );
  const analysisResult = serverAnalysis && !showDemoData ? serverAnalysis.result : result;
  const analysisSampleCount = serverAnalysis && !showDemoData ? serverAnalysis.sampleCount : activeSamples.length;
  const sourceLabel = showDemoData ? "sample data" : serverAnalysis ? "saved GPS" : "GPS";
  const canStop = tracker.isTracking || tracker.isBackgroundTracking;

  useEffect(() => {
    if (!hasRun || analysisResult.recurringRoutes.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      for (const route of analysisResult.recurringRoutes) {
        const sent = await notifyPotentialRouteDetected(route);
        if (!sent && !cancelled) {
          Alert.alert("Potential frequent route found", routeNotificationMessage(route));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasRun, analysisResult.recurringRoutes.map(routeNotificationKey).join(",")]);

  useEffect(() => {
    if (!hasRun || analysisResult.recurringRoutes.length === 0) {
      return;
    }
    let cancelled = false;
    const endpoints = analysisResult.recurringRoutes.flatMap((route) => [route.origin, route.destination]);
    const missing = endpoints.filter((endpoint) => endpointLabels[coordinateKey(endpoint)] === undefined);
    if (missing.length === 0) {
      return;
    }

    void (async () => {
      const resolved: Record<string, string> = {};
      for (const endpoint of missing) {
        const key = coordinateKey(endpoint);
        try {
          const [address] = await Location.reverseGeocodeAsync({
            latitude: endpoint.lat,
            longitude: endpoint.lng,
          });
          resolved[key] = address ? formatGeocodeAddress(address) ?? coordinateLabel(endpoint) : coordinateLabel(endpoint);
        } catch {
          resolved[key] = coordinateLabel(endpoint);
        }
      }
      if (!cancelled) {
        setEndpointLabels((prev) => ({ ...prev, ...resolved }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisResult.recurringRoutes, endpointLabels, hasRun]);

  const toggleRoute = (route: DetectedRecurringRoute, index: number) => {
    const key = `${route.origin.id}-${route.destination.id}-${index}`;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRoutes((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const labelsForRoute = (route: DetectedRecurringRoute, index: number) => ({
    destinationLabel:
      (showDemoData ? demoEndpointLabel(route.destination) : null) ??
      endpointLabels[coordinateKey(route.destination)] ??
      fallbackEndpointLabel("destination", index),
    originLabel:
      (showDemoData ? demoEndpointLabel(route.origin) : null) ??
      endpointLabels[coordinateKey(route.origin)] ??
      fallbackEndpointLabel("origin", index),
  });

  const saveCandidate = (
    route: DetectedRecurringRoute,
    index: number,
    labels: { destinationLabel: string; originLabel: string },
  ) => {
    onSaveCandidate(toDetectedDraft(route, index, labels));
  };

  const fetchSavedAnalysis = async () => {
    const response = await apiRequest<{
      result: RouteDetectionResult;
      sampleCount: number;
    }>("/me/route-analysis", { method: "GET" });
    return {
      result: response.result,
      sampleCount: response.sampleCount,
    };
  };

  const analyzeSavedSamples = async () => {
    setHasRun(true);
    setShowDemoData(false);
    setServerAnalysisError(null);
    try {
      let analysis = await fetchSavedAnalysis();
      if (analysis.result.recurringRoutes.length === 0) {
        await apiRequest<{ inserted: number }>("/me/location-samples", {
          method: "POST",
          json: {
            samples: demoSamples(),
          },
        });
        analysis = await fetchSavedAnalysis();
      }
      setServerAnalysis(analysis);
    } catch (e) {
      const body = e instanceof ApiError ? (e.body as { error?: string }) : null;
      setServerAnalysisError(body?.error ?? "Could not analyze saved GPS samples.");
    }
  };

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
            setServerAnalysis(null);
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
              setServerAnalysis(null);
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
            setServerAnalysis(null);
            setHasRun(true);
          }}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Route color={authTheme.colors.primary} size={17} strokeWidth={2.4} />
          <Text style={styles.secondaryActionLabel}>Use sample data</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void analyzeSavedSamples()}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Route color={authTheme.colors.primary} size={17} strokeWidth={2.4} />
          <Text style={styles.secondaryActionLabel}>Analyze saved</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setShowDemoData(false);
            setServerAnalysis(null);
            setServerAnalysisError(null);
            resetDetectedRouteNotificationMemory();
            tracker.clearSamples();
          }}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionLabel}>Clear</Text>
        </Pressable>
      </View>

      {hasRun ? (
        <View style={styles.result}>
          <Text style={styles.resultLine}>Source: {sourceLabel}</Text>
          {serverAnalysis ? (
            <View style={styles.analysisPanel}>
              <Text style={styles.resultTitle}>Saved GPS analysis</Text>
              <View style={styles.analysisMetricBlock}>
                <AnalysisMetricRow label="Samples analyzed" value={analysisSampleCount} />
                <AnalysisMetricRow label="Place clusters" value={analysisResult.stops.length} />
                <AnalysisMetricRow label="Frequent routes" value={analysisResult.recurringRoutes.length} />
                <AnalysisMetricRow
                  label="Detection status"
                  tone={analysisResult.recurringRoutes.length > 0 ? "positive" : "default"}
                  value={routeAnalysisStatus(analysisResult)}
                />
                <AnalysisMetricRow label="Pattern strength" value={routeAnalysisStrength(analysisResult)} />
              </View>
              {analysisResult.recurringRoutes.length > 0 ? (
                <View style={styles.patternSummaryBlock}>
                  <Text style={styles.resultTitle}>Route pattern summary</Text>
                  {analysisResult.recurringRoutes.map((route, index) => (
                    <View key={`${route.origin.id}-${route.destination.id}-${index}-summary`} style={styles.patternCard}>
                      <Text style={styles.patternName}>Route {index + 1}</Text>
                      <Text style={styles.patternMain}>
                        {route.typicalDepartureTime} {"->"} {route.typicalArrivalTime}
                      </Text>
                      <Text style={styles.patternMeta}>{formatDays(route.daysOfWeek)}</Text>
                      <Text style={styles.patternMeta}>
                        {route.tripCount} trips - {Math.round(route.confidence * 100)}% confidence
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <>
              <Text style={styles.resultLine}>Samples: {analysisSampleCount}</Text>
              <Text style={styles.resultLine}>Stops found: {analysisResult.stops.length}</Text>
            </>
          )}
          <Text style={styles.resultLine}>Permission: {tracker.permissionStatus ?? "unknown"}</Text>
          {tracker.error ? <Text style={styles.errorLine}>{tracker.error}</Text> : null}
          {serverAnalysisError ? <Text style={styles.errorLine}>{serverAnalysisError}</Text> : null}
          {analysisResult.recurringRoutes.length > 0 && !serverAnalysis ? (
            <>
              <Text style={styles.resultTitle}>Detected routes</Text>
              {analysisResult.recurringRoutes.map((detectedRoute, index) => {
                const key = `${detectedRoute.origin.id}-${detectedRoute.destination.id}-${index}`;
                return (
                  <DetectedRouteCard
                    key={key}
                    expanded={expandedRoutes[key] ?? true}
                    index={index}
                    labels={labelsForRoute(detectedRoute, index)}
                    onSave={saveCandidate}
                    onToggle={() => toggleRoute(detectedRoute, index)}
                    route={detectedRoute}
                  />
                );
              })}
            </>
          ) : null}
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
  analysisMetricBlock: {
    gap: 6,
  },
  analysisMetricLabel: {
    color: authTheme.colors.muted,
    flex: 1,
    fontSize: authTheme.typography.caption,
    fontWeight: "700",
  },
  analysisMetricRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: authTheme.space.sm,
    justifyContent: "space-between",
  },
  analysisMetricValue: {
    color: authTheme.colors.foreground,
    flexShrink: 1,
    fontSize: authTheme.typography.caption,
    fontWeight: "800",
    textAlign: "right",
  },
  analysisMetricValuePositive: {
    color: authTheme.colors.primaryPressed,
  },
  analysisPanel: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: authTheme.space.sm,
    padding: authTheme.space.sm,
  },
  description: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
    lineHeight: 20,
  },
  panel: {
    gap: authTheme.space.sm,
  },
  patternSummaryBlock: {
    gap: 4,
    paddingVertical: 2,
  },
  patternCard: {
    backgroundColor: authTheme.colors.background,
    borderColor: authTheme.colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
    padding: authTheme.space.sm,
  },
  patternMain: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "800",
  },
  patternMeta: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "700",
  },
  patternName: {
    color: authTheme.colors.primaryPressed,
    fontSize: authTheme.typography.caption,
    fontWeight: "800",
  },
  errorLine: {
    color: authTheme.colors.danger,
    fontSize: authTheme.typography.caption,
    fontWeight: "700",
  },
  endpointBlock: {
    gap: 2,
  },
  endpointLabel: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "700",
  },
  endpointValue: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
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
  routeCard: {
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  routeChevron: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.subhead,
    fontWeight: "800",
    marginLeft: authTheme.space.sm,
  },
  routeDetails: {
    borderTopColor: authTheme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    padding: authTheme.space.sm,
  },
  routeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: authTheme.space.sm,
  },
  routeHeaderPressed: {
    backgroundColor: authTheme.colors.background,
  },
  routeHeaderText: {
    flex: 1,
    gap: 2,
  },
  routeMeta: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
  },
  routeName: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "800",
  },
  saveAction: {
    alignItems: "center",
    backgroundColor: authTheme.colors.primary,
    borderRadius: authTheme.radii.control,
    flexDirection: "row",
    gap: authTheme.space.xs,
    justifyContent: "center",
    marginTop: authTheme.space.sm,
    minHeight: 44,
    paddingHorizontal: authTheme.space.md,
  },
  saveActionLabel: {
    color: authTheme.colors.onPrimary,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
  },
  saveActionPressed: {
    backgroundColor: authTheme.colors.primaryPressed,
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
