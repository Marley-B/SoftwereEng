import Constants from 'expo-constants';
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { PlaceRef } from '@route-helper/shared';
import { authTheme } from '../../auth/theme';

export type RouteEndpointCoordinate =
  | {
      latitude: number;
      longitude: number;
    }
  | PlaceRef;

interface RouteEndpointsMapProps {
  departure: RouteEndpointCoordinate | null;
  destination: RouteEndpointCoordinate | null;
  transitPayload?: Record<string, unknown> | null;
}

const MAP_HEIGHT = 240;
const STATIC_SIZE = '640x240';

function extractEncodedPolylines(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }
  const legs = (payload as Record<string, unknown>)['legs'];
  if (!Array.isArray(legs) || legs.length === 0) {
    return [];
  }

  const polylines: string[] = [];
  for (const leg of legs) {
    if (!leg || typeof leg !== 'object') {
      continue;
    }
    const steps = (leg as Record<string, unknown>)['steps'];
    if (!Array.isArray(steps)) {
      continue;
    }

    for (const step of steps) {
      if (!step || typeof step !== 'object') {
        continue;
      }
      const polyline = (step as Record<string, unknown>)['polyline'];
      if (!polyline || typeof polyline !== 'object') {
        continue;
      }
      const encoded =
        typeof (polyline as Record<string, unknown>)['encodedPolyline'] === 'string'
          ? (polyline as Record<string, unknown>)['encodedPolyline'] as string
          : typeof (polyline as Record<string, unknown>)['points'] === 'string'
          ? (polyline as Record<string, unknown>)['points'] as string
          : undefined;
      if (encoded && encoded.trim().length > 0) {
        polylines.push(encoded.trim());
      }
    }
  }

  return polylines;
}

/** Google Static Maps only (no Apple MapKit / native map views). */
function normalizeEndpoint(endpoint: RouteEndpointCoordinate | null): { latitude: number; longitude: number } | null {
  if (!endpoint) {
    return null;
  }
  if ('latitude' in endpoint && 'longitude' in endpoint) {
    return { latitude: endpoint.latitude, longitude: endpoint.longitude };
  }
  return { latitude: endpoint.lat, longitude: endpoint.lng };
}

function buildStaticMapUrl(
  departure: RouteEndpointCoordinate | null,
  destination: RouteEndpointCoordinate | null,
  apiKey: string,
  encodedPolylines: string[] = [],
): string | null {
  const normalizedDeparture = normalizeEndpoint(departure);
  const normalizedDestination = normalizeEndpoint(destination);

  if (!apiKey.trim()) {
    return null;
  }
  if (!normalizedDeparture && !normalizedDestination) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('maptype', 'roadmap');
  params.set('size', STATIC_SIZE);
  params.set('scale', '2');
  params.set('key', apiKey.trim());

  if (normalizedDeparture) {
    params.append(
      'markers',
      `color:0x2563eb|size:mid|label:D|${normalizedDeparture.latitude},${normalizedDeparture.longitude}`,
    );
  }
  if (normalizedDestination) {
    params.append(
      'markers',
      `color:0xc026d3|size:mid|label:A|${normalizedDestination.latitude},${normalizedDestination.longitude}`,
    );
  }
  if (encodedPolylines.length > 0) {
    for (const polyline of encodedPolylines) {
      params.append('path', `color:0x2563eb|weight:4|enc:${polyline}`);
    }
  } else if (normalizedDeparture && normalizedDestination) {
    params.set(
      'path',
      `color:0x64748b99|weight:3|${normalizedDeparture.latitude},${normalizedDeparture.longitude}|${normalizedDestination.latitude},${normalizedDestination.longitude}`,
    );
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function RouteEndpointsMap({ departure, destination, transitPayload }: RouteEndpointsMapProps) {
  // Read EXPO_PUBLIC_* here (not only via app.config extra): Metro inlines these from .env;
  // extra is a fallback if the key is injected at build time without Metro env transform.
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY ?? '';
  const extra = Constants.expoConfig?.extra as { googleMapsStaticApiKey?: string } | undefined;
  const apiKey = (fromEnv || (extra?.googleMapsStaticApiKey ?? '')).trim();

  const encodedPolylines = useMemo(() => extractEncodedPolylines(transitPayload), [transitPayload]);
  const uri = useMemo(
    () => buildStaticMapUrl(departure, destination, apiKey, encodedPolylines),
    [departure, destination, apiKey, encodedPolylines],
  );

  const hasAny = Boolean(departure ?? destination);

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>Route preview (Google Maps)</Text>
      {!apiKey.trim() ? (
        <View style={styles.panel}>
          <Text style={styles.warn}>
            Set EXPO_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY and enable Maps Static API in Google Cloud to show the map.
          </Text>
        </View>
      ) : uri ? (
        <Image accessibilityLabel='Map preview with departure and destination' source={{ uri }} style={styles.map} />
      ) : (
        <View style={styles.panel}>
          {hasAny ? null : (
            <Text style={styles.hint}>
              Enter departure and destination — a Google map appears when both coordinates resolve.
            </Text>
          )}
        </View>
      )}
      {apiKey.trim() && uri ? (
        <Text style={styles.attribution}>Map data © Google · Imagery © Google</Text>
      ) : (
        <Text style={styles.attribution}>Address search and map preview use Google Maps</Text>
      )}
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
    fontWeight: '700',
    marginBottom: authTheme.space.xs,
  },
  hint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
  },
  map: {
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    height: MAP_HEIGHT,
    resizeMode: 'cover',
    width: '100%',
  },
  panel: {
    alignItems: 'center',
    backgroundColor: authTheme.colors.surface,
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: 'center',
    minHeight: MAP_HEIGHT,
    padding: authTheme.space.md,
    width: '100%',
  },
  warn: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  wrap: {
    width: '100%',
  },
});
