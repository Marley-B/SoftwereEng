import { StyleSheet, Text, View } from "react-native";

import { authTheme } from "../../auth/theme";

export interface RouteEndpointCoordinate {
  latitude: number;
  longitude: number;
}

interface RouteEndpointsMapProps {
  departure: RouteEndpointCoordinate | null;
  destination: RouteEndpointCoordinate | null;
}

function formatCoord(label: string, c: RouteEndpointCoordinate | null): string {
  if (!c) {
    return `${label}: —`;
  }
  return `${label}: ${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`;
}

export function RouteEndpointsMap({
  departure,
  destination,
}: RouteEndpointsMapProps) {
  const hasAny = Boolean(departure ?? destination);

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>Route preview</Text>
      <View style={styles.panel}>
        <Text style={styles.banner}>
          Interactive map is available on iOS and Android builds.
        </Text>
        {hasAny ? (
          <>
            <Text style={styles.coord}>{formatCoord("Departure", departure)}</Text>
            <Text style={styles.coord}>{formatCoord("Destination", destination)}</Text>
          </>
        ) : (
          <Text style={styles.hint}>
            Enter addresses — coordinates appear here once locations resolve.
          </Text>
        )}
      </View>
      <Text style={styles.attribution}>
        Search © OpenStreetMap contributors (Photon/Komoot)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  attribution: {
    color: authTheme.colors.muted,
    fontSize: 11,
    marginTop: authTheme.space.xs,
  },
  banner: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    marginBottom: authTheme.space.sm,
  },
  caption: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
    marginBottom: authTheme.space.xs,
  },
  coord: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.caption,
    fontWeight: "600",
    marginTop: 4,
  },
  hint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    marginBottom: authTheme.space.xs,
    marginTop: authTheme.space.xs,
  },
  panel: {
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    minHeight: 160,
    padding: authTheme.space.md,
  },
  wrap: {
    width: "100%",
  },
});
