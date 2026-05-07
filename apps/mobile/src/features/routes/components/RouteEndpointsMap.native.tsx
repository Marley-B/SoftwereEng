import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { authTheme } from "../../auth/theme";

export interface RouteEndpointCoordinate {
  latitude: number;
  longitude: number;
}

interface RouteEndpointsMapProps {
  departure: RouteEndpointCoordinate | null;
  destination: RouteEndpointCoordinate | null;
}

const DEFAULT_REGION = {
  latitude: 40.4168,
  latitudeDelta: 8,
  longitude: -3.7038,
  longitudeDelta: 8,
};

export function RouteEndpointsMap({
  departure,
  destination,
}: RouteEndpointsMapProps) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    const pts: RouteEndpointCoordinate[] = [];
    if (departure) {
      pts.push(departure);
    }
    if (destination) {
      pts.push(destination);
    }
    if (pts.length === 0 || !mapRef.current) {
      return;
    }

    mapRef.current.fitToCoordinates(
      pts.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
      {
        animated: true,
        edgePadding: { bottom: 48, left: 48, right: 48, top: 48 },
      },
    );
  }, [departure, destination]);

  const hasAny = Boolean(departure ?? destination);
  const initialRegion =
    departure ?? destination
      ? {
          latitude: (departure ?? destination)!.latitude,
          latitudeDelta: 0.15,
          longitude: (departure ?? destination)!.longitude,
          longitudeDelta: 0.15,
        }
      : DEFAULT_REGION;

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>Route preview</Text>
      <MapView
        initialRegion={initialRegion}
        ref={mapRef}
        rotateEnabled={false}
        style={styles.map}
      >
        {departure ? (
          <Marker
            coordinate={departure}
            identifier="departure"
            pinColor={authTheme.colors.primary}
            title="Departure"
          />
        ) : null}
        {destination ? (
          <Marker
            coordinate={destination}
            identifier="destination"
            pinColor="#c026d3"
            title="Destination"
          />
        ) : null}
      </MapView>
      {!hasAny ? (
        <Text style={styles.hint}>
          Enter departure and destination — pins appear when locations resolve.
        </Text>
      ) : null}
      <Text style={styles.attribution}>
        Search & map data © OpenStreetMap contributors
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
  caption: {
    color: authTheme.colors.foreground,
    fontSize: authTheme.typography.label,
    fontWeight: "700",
    marginBottom: authTheme.space.xs,
  },
  hint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    marginBottom: authTheme.space.xs,
    marginTop: authTheme.space.xs,
  },
  map: {
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    height: 240,
    overflow: "hidden",
    width: "100%",
  },
  wrap: {
    width: "100%",
  },
});
