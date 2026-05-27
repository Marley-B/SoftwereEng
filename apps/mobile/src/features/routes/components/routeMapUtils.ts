export function extractEncodedPolylines(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const visited = new WeakSet<object>();
  const encoded = new Set<string>();

  const addEncoded = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      encoded.add(trimmed);
    }
  };

  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const objectValue = value as Record<string, unknown>;
    if (visited.has(objectValue)) {
      return;
    }
    visited.add(objectValue);

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }

    addEncoded(objectValue.encodedPolyline);
    addEncoded(objectValue.points);

    if ("polyline" in objectValue) {
      walk(objectValue.polyline);
    }

    for (const nested of Object.values(objectValue)) {
      if (nested && typeof nested === "object") {
        walk(nested);
      }
    }
  };

  walk(payload);
  return [...encoded];
}

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export function decodePolyline(encoded: string): MapPoint[] {
  const points: MapPoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;

    while (true) {
      if (index >= encoded.length) {
        return points;
      }
      const b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) {
        break;
      }
    }

    const deltaLatitude = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    while (true) {
      if (index >= encoded.length) {
        return points;
      }
      const b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) {
        break;
      }
    }

    const deltaLongitude = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    latitude += deltaLatitude;
    longitude += deltaLongitude;

    points.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return points;
}