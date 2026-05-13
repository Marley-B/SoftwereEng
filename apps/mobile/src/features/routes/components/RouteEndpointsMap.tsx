import Constants from 'expo-constants';
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { authTheme } from '../../auth/theme';

export interface RouteEndpointCoordinate {
  latitude: number;
  longitude: number;
}

interface RouteEndpointsMapProps {
  departure: RouteEndpointCoordinate | null;
  destination: RouteEndpointCoordinate | null;
}

const MAP_HEIGHT = 240;
const STATIC_SIZE = '640x240';

/** Google Static Maps only (no Apple MapKit / native map views). */
function buildStaticMapUrl(
  departure: RouteEndpointCoordinate | null,
  destination: RouteEndpointCoordinate | null,
  apiKey: string,
): string | null {
  if (!apiKey.trim()) {
    return null;
  }
  if (!departure && !destination) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('maptype', 'roadmap');
  params.set('size', STATIC_SIZE);
  params.set('scale', '2');
  params.set('key', apiKey.trim());

  if (departure) {
    params.append('markers', `color:0x2563eb|size:mid|label:D|${departure.latitude},${departure.longitude}`);
  }
  if (destination) {
    params.append('markers', `color:0xc026d3|size:mid|label:A|${destination.latitude},${destination.longitude}`);
  }
  if (departure && destination) {
    params.set(
      'path',
      `color:0x64748b99|weight:3|${departure.latitude},${departure.longitude}|${destination.latitude},${destination.longitude}`,
    );
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function RouteEndpointsMap({ departure, destination }: RouteEndpointsMapProps) {
  // Read EXPO_PUBLIC_* here (not only via app.config extra): Metro inlines these from .env;
  // extra is a fallback if the key is injected at build time without Metro env transform.
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY ?? '';
  const extra = Constants.expoConfig?.extra as { googleMapsStaticApiKey?: string } | undefined;
  const apiKey = (fromEnv || (extra?.googleMapsStaticApiKey ?? '')).trim();

  const uri = useMemo(() => buildStaticMapUrl(departure, destination, apiKey), [departure, destination, apiKey]);

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
