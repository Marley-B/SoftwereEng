import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';

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
  onDeleteRoute?: (routeId: string) => void;
  onEditRoute?: (routeId: string) => void;
  onInteractionEnd?: () => void;
  onInteractionStart?: () => void;
}

const MAP_HEIGHT = 420;
const ROUTE_COLORS = ['#2563eb', '#c026d3', '#0f766e', '#ea580c', '#7c3aed', '#0891b2'];

interface RouteGeometry {
  id: string;
  color: string;
  departure: { latitude: number; longitude: number } | null;
  destination: { latitude: number; longitude: number } | null;
  polylines: MapPoint[][];
  name: string;
}

interface RouteHitResult {
  distance: number;
  route: RouteGeometry;
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

function buildRouteGeometry(routes: Route[]): RouteGeometry[] {
  return routes.map((route, index) => {
    const color = ROUTE_COLORS[index % ROUTE_COLORS.length]!;
    const departure = normalizeEndpoint(route.origin);
    const destination = normalizeEndpoint(route.destinationPlace);
    const polylines = extractEncodedPolylines(route.transitSnapshot?.selectedPayload ?? null)
      .map((encoded) => decodePolyline(encoded))
      .filter((coordinates) => coordinates.length > 1);

    return {
      id: route.id,
      color,
      departure,
      destination,
      polylines,
      name: route.name,
    };
  });
}

function ensureLeafletCss() {
  const root = globalThis as typeof globalThis & { document?: { createElement: (tag: string) => any; getElementById: (id: string) => any; head: { appendChild: (node: any) => void } } };
  if (!root.document) {
    return;
  }
  if (root.document.getElementById('leaflet-css')) {
    return;
  }
  const link = root.document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.crossOrigin = 'anonymous';
  root.document.head.appendChild(link);
}

function createPopupContent(
  leaflet: typeof import('leaflet'),
  route: RouteGeometry,
  onDeleteRoute?: (routeId: string) => void,
  onEditRoute?: (routeId: string) => void,
) {
  const wrapper = leaflet.DomUtil.create('div', 'route-popup');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '8px';
  wrapper.style.minWidth = '160px';
  wrapper.style.padding = '2px';

  const title = leaflet.DomUtil.create('div', '', wrapper);
  title.textContent = route.name;
  title.style.fontWeight = '700';
  title.style.fontSize = '14px';
  title.style.color = '#111827';

  const buttons = leaflet.DomUtil.create('div', '', wrapper);
  buttons.style.display = 'flex';
  buttons.style.gap = '8px';
  buttons.style.marginTop = '2px';

  const sharedButtonStyles = {
    alignItems: 'center',
    borderRadius: '10px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'inline-flex',
    flex: '1 1 0',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: '700',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '0 14px',
  } as const;

  const editButton = leaflet.DomUtil.create('button', '', buttons);
  editButton.type = 'button';
  editButton.textContent = 'Edit';
  Object.assign(editButton.style, sharedButtonStyles, {
    backgroundColor: authTheme.colors.primary,
    border: 'none',
    color: authTheme.colors.onPrimary,
  });

  const deleteButton = leaflet.DomUtil.create('button', '', buttons);
  deleteButton.type = 'button';
  deleteButton.textContent = 'Delete';
  Object.assign(deleteButton.style, sharedButtonStyles, {
    backgroundColor: 'transparent',
    border: `1px solid ${authTheme.colors.dangerMuted}`,
    color: authTheme.colors.danger,
  });

  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  editButton.addEventListener('click', (event: Event) => {
    stop(event);
    onEditRoute?.(route.id);
  });
  deleteButton.addEventListener('click', (event: Event) => {
    stop(event);
    onDeleteRoute?.(route.id);
  });

  leaflet.DomEvent.disableClickPropagation(wrapper);
  leaflet.DomEvent.disableScrollPropagation(wrapper);

  return wrapper;
}

function getRouteHits(
  leaflet: typeof import('leaflet'),
  map: LeafletMap,
  geometry: RouteGeometry[],
  latlng: { latitude: number; longitude: number },
): RouteHitResult[] {
  const point = map.latLngToLayerPoint([latlng.latitude, latlng.longitude]);
  const routeHits = new Map<string, RouteHitResult>();

  geometry.forEach((route) => {
    let routeDistance = Number.POSITIVE_INFINITY;

    route.polylines.forEach((coordinates) => {
      if (coordinates.length < 2) {
        return;
      }

      const points = coordinates.map(({ latitude, longitude }) => map.latLngToLayerPoint([latitude, longitude]));

      for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        if (!start || !end) {
          continue;
        }
        const distance = leaflet.LineUtil.pointToSegmentDistance(point, start, end);
        routeDistance = Math.min(routeDistance, distance);
      }
    });

    if (Number.isFinite(routeDistance) && routeDistance <= 16) {
      const previous = routeHits.get(route.id);
      if (!previous || routeDistance < previous.distance) {
        routeHits.set(route.id, { distance: routeDistance, route });
      }
    }
  });

  return [...routeHits.values()].sort((left, right) => left.distance - right.distance);
}

export function RoutesOverviewMap({ onDeleteRoute, onEditRoute, routes }: RoutesOverviewMapProps) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const hoverTooltipRef = useRef<any>(null);
  const chooserPopupRef = useRef<any>(null);
  const [leafletModule, setLeafletModule] = useState<typeof import('leaflet') | null>(null);

  const geometry = useMemo(() => buildRouteGeometry(routes), [routes]);
  const hasRoutes = routes.length > 0;

  const invalidateSize = useCallback(() => {
    if (!mapRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((leaflet) => {
      if (cancelled) {
        return;
      }
      ensureLeafletCss();
      setLeafletModule(leaflet);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!leafletModule || !containerRef.current || mapRef.current) {
      return;
    }

    const map = leafletModule.map(containerRef.current, {
      doubleClickZoom: true,
      dragging: true,
      preferCanvas: true,
      scrollWheelZoom: true,
      touchZoom: true,
      zoomControl: true,
    });

    mapRef.current = map;
    leafletModule
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 20,
      })
      .addTo(map);

    const hideHover = () => {
      hoverTooltipRef.current?.remove();
      hoverTooltipRef.current = null;
    };

    const hideChooser = () => {
      chooserPopupRef.current?.remove();
      chooserPopupRef.current = null;
    };

    const showHover = (latlng: { latitude: number; longitude: number }, hits: RouteHitResult[]) => {
      hideHover();

      if (hits.length === 0) {
        return;
      }

      const label = hits[0]?.route.name ?? '';

      hoverTooltipRef.current = leafletModule.tooltip({
        direction: 'top',
        offset: [0, -10],
        opacity: 0.95,
        permanent: false,
        sticky: false,
      })
        .setLatLng([latlng.latitude, latlng.longitude])
        .setContent(label)
        .addTo(map);
    };

    const handleHover = (event: { latlng: { lat: number; lng: number } }) => {
      const hits = getRouteHits(leafletModule, map, geometry, { latitude: event.latlng.lat, longitude: event.latlng.lng });
      if (hits.length === 0) {
        hideHover();
        return;
      }

      showHover({ latitude: event.latlng.lat, longitude: event.latlng.lng }, hits);
    };

    const handleClick = (event: { latlng: { lat: number; lng: number } }) => {
      const hits = getRouteHits(leafletModule, map, geometry, { latitude: event.latlng.lat, longitude: event.latlng.lng });
      if (hits.length === 0) {
        hideChooser();
        return;
      }

      hideChooser();
      const selectedRoute = hits[0]!.route;
      chooserPopupRef.current = leafletModule
        .popup({
          closeButton: true,
          maxWidth: 260,
          offset: [0, -8],
        })
        .setLatLng([event.latlng.lat, event.latlng.lng])
        .setContent(createPopupContent(leafletModule, selectedRoute, onDeleteRoute, onEditRoute))
        .openOn(map);
    };

    map.on('mousemove', handleHover);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleHover);
      map.off('click', handleClick);
      hideHover();
      hideChooser();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [geometry, leafletModule, onDeleteRoute, onEditRoute]);

  useEffect(() => {
    if (!leafletModule || !mapRef.current) {
      return;
    }

    const map = mapRef.current;
    if (layerRef.current) {
      layerRef.current.remove();
    }

    const layerGroup = leafletModule.layerGroup().addTo(map);
    layerRef.current = layerGroup;

    const bounds: Array<[number, number]> = [];

    geometry.forEach((route) => {
      const paneName = `route-pane-${route.id}`;

      if (!map.getPane(paneName)) {
        const pane = map.createPane(paneName) as unknown as { style: { zIndex: string } };
        pane.style.zIndex = '500';
      }

      if (route.departure) {
        bounds.push([route.departure.latitude, route.departure.longitude]);
        leafletModule
          .circleMarker([route.departure.latitude, route.departure.longitude], {
            color: route.color,
            fillColor: route.color,
            fillOpacity: 1,
            opacity: 1,
            radius: 7,
            weight: 2,
          })
          .addTo(layerGroup);
      }

      if (route.destination) {
        bounds.push([route.destination.latitude, route.destination.longitude]);
        leafletModule
          .circleMarker([route.destination.latitude, route.destination.longitude], {
            color: route.color,
            fillColor: route.color,
            fillOpacity: 1,
            opacity: 1,
            radius: 7,
            weight: 2,
          })
          .addTo(layerGroup);
      }

      route.polylines.forEach((coordinates) => {
        const points = coordinates.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]);
        points.forEach((point) => bounds.push(point));

        leafletModule
          .polyline(points, {
            color: route.color,
            fill: false,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false,
            opacity: 0.9,
            pane: paneName,
            weight: 6,
          })
          .addTo(layerGroup);
      });
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
    }

      requestAnimationFrame(() => {
        invalidateSize();
      });
  }, [geometry, invalidateSize, leafletModule]);

  return (
    <View style={styles.wrap}>
      <View ref={containerRef as never} style={styles.map} />
      {hasRoutes ? (
        <Text style={styles.attribution}>OpenStreetMap · pinch, drag, and scroll to explore</Text>
      ) : (
        <Text style={styles.attribution}>Add a route to see all saved routes on the map</Text>
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
  map: {
    borderColor: authTheme.colors.border,
    borderRadius: authTheme.radii.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    height: MAP_HEIGHT,
    overflow: 'hidden',
    width: '100%',
  },
  wrap: {
    width: '100%',
  },
});