import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';

import type { PlaceRef } from '@route-helper/shared';

import { authTheme } from '../../auth/theme';
import type { Route } from '../types';
import { decodePolyline, extractEncodedPolylines, type MapPoint } from './routeMapUtils';

type RouteEndpointCoordinate =
  | {
      latitude: number;
      longitude: number;
    }
  | PlaceRef;

interface RoutesOverviewMapProps {
  routes: Route[];
  onInteractionEnd?: () => void;
  onInteractionStart?: () => void;
}

const MAP_HEIGHT = 420;
const ROUTE_COLORS = ['#2563eb', '#c026d3', '#0f766e', '#ea580c', '#7c3aed', '#0891b2'];

interface RouteGeometry {
  color: string;
  departure: { latitude: number; longitude: number } | null;
  destination: { latitude: number; longitude: number } | null;
  polylines: MapPoint[][];
}

function normalizeEndpoint(endpoint: RouteEndpointCoordinate | null): { latitude: number; longitude: number } | null {
  if (!endpoint) {
    return null;
  }
  if ('latitude' in endpoint && 'longitude' in endpoint) {
    return { latitude: endpoint.latitude, longitude: endpoint.longitude };
  }
  return { latitude: endpoint.lat, longitude: endpoint.lng };
}

function computeRegion(points: LatLng[]): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null {
  if (points.length === 0) {
    return null;
  }

  let minLatitude = points[0]?.latitude ?? 0;
  let maxLatitude = points[0]?.latitude ?? 0;
  let minLongitude = points[0]?.longitude ?? 0;
  let maxLongitude = points[0]?.longitude ?? 0;

  for (const point of points) {
    minLatitude = Math.min(minLatitude, point.latitude);
    maxLatitude = Math.max(maxLatitude, point.latitude);
    minLongitude = Math.min(minLongitude, point.longitude);
    maxLongitude = Math.max(maxLongitude, point.longitude);
  }

  const latitudeDelta = Math.max((maxLatitude - minLatitude) * 1.35, 0.02);
  const longitudeDelta = Math.max((maxLongitude - minLongitude) * 1.35, 0.02);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

function buildRouteGeometry(routes: Route[]): RouteGeometry[] {
  return routes.map((route, index) => {
    const color = ROUTE_COLORS[index % ROUTE_COLORS.length]!;
    const departure = normalizeEndpoint(route.origin);
    const destination = normalizeEndpoint(route.destinationPlace);
    const polylines = extractEncodedPolylines(route.transitSnapshot?.selectedPayload ?? null)
      .map((encoded) => decodePolyline(encoded))
      .filter((coordinates) => coordinates.length > 1);

    return {
      color,
      departure,
      destination,
      polylines,
    };
  });
}

export function RoutesOverviewMap({ onInteractionEnd, onInteractionStart, routes }: RoutesOverviewMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const geometry = useMemo(() => buildRouteGeometry(routes), [routes]);
  const coordinates = useMemo(
    () =>
      geometry.flatMap((route) => [
        ...(route.departure ? [route.departure] : []),
        ...(route.destination ? [route.destination] : []),
        ...route.polylines.flatMap((polyline) => polyline),
      ]),
    [geometry],
  );
  const region = useMemo(() => computeRegion(coordinates), [coordinates]);
  const hasRoutes = routes.length > 0;

  useEffect(() => {
    if (!mapRef.current || coordinates.length === 0) {
      return;
    }
    mapRef.current.fitToCoordinates(coordinates, {
      animated: false,
      edgePadding: {
        top: 48,
        right: 48,
        bottom: 48,
        left: 48,
      },
    });
  }, [coordinates]);

  return (
    <View style={styles.wrap}>
      {region ? (
        <View onTouchCancel={onInteractionEnd} onTouchEnd={onInteractionEnd} onTouchStart={onInteractionStart} style={styles.mapShell}>
          <MapView
            ref={mapRef}
            initialRegion={region}
            loadingEnabled
            mapPadding={{ top: 32, right: 32, bottom: 32, left: 32 }}
            pitchEnabled
            rotateEnabled
            scrollEnabled
            showsCompass
            showsMyLocationButton={false}
            showsScale
            showsTraffic={false}
            style={styles.map}
            toolbarEnabled={false}
            zoomEnabled
          >
            {geometry.map((route, index) => (
              <>
                {route.departure ? <Marker coordinate={route.departure} pinColor='#2563eb' /> : null}
                {route.destination ? <Marker coordinate={route.destination} pinColor='#c026d3' /> : null}
                {route.polylines.map((coordinates, polylineIndex) => (
                  <Polyline
                    key={`route-${index}-poly-${polylineIndex}`}
                    coordinates={coordinates}
                    strokeColor={route.color}
                    strokeWidth={4}
                  />
                ))}
              </>
            ))}
          </MapView>
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.hint}>
            {hasRoutes ? 'Saved routes are missing coordinates, so the map cannot be drawn.' : 'Add a route to see all saved routes on the map.'}
          </Text>
        </View>
      )}
      <Text style={styles.attribution}>Interactive map · pinch to zoom and drag</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  attribution: {
    color: authTheme.colors.muted,
    fontSize: 11,
    marginTop: authTheme.space.xs,
  },
  hint: {
    color: authTheme.colors.muted,
    fontSize: authTheme.typography.caption,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  mapShell: {
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    height: MAP_HEIGHT,
    overflow: 'hidden',
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
  wrap: {
    width: '100%',
  },
});