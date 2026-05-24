export interface LocationSample {
  accuracyMeters?: number;
  lat: number;
  lng: number;
  recordedAt: Date | string;
}

interface RouteDetectionOptions {
  endpointClusterRadiusMeters: number;
  maxAccuracyMeters: number;
  maxSampleGapMs: number;
  maxTripDurationMs: number;
  minRouteRepeats: number;
  minStopDurationMs: number;
  minStopSamples: number;
  stopRadiusMeters: number;
  timeZone: string;
}

interface DetectedStop {
  durationMs: number;
  endedAt: string;
  id: string;
  lat: number;
  lng: number;
  sampleCount: number;
  startedAt: string;
}

interface RecurringEndpoint {
  daysOfWeek: WeekdayName[];
  firstSeenAt: string;
  id: string;
  lastSeenAt: string;
  lat: number;
  lng: number;
  visitCount: number;
}

export interface DetectedRecurringRoute {
  confidence: number;
  daysOfWeek: WeekdayName[];
  destination: RecurringEndpoint;
  origin: RecurringEndpoint;
  tripCount: number;
  typicalArrivalTime: string;
  typicalDepartureTime: string;
}

export interface RouteDetectionResult {
  recurringRoutes: DetectedRecurringRoute[];
  recurringEndpoints: RecurringEndpoint[];
  stops: DetectedStop[];
}

type WeekdayName =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

interface NormalizedSample {
  accuracyMeters?: number;
  lat: number;
  lng: number;
  recordedAt: Date;
}

interface MutableEndpoint {
  days: Set<WeekdayName>;
  firstSeenAt: Date;
  id: string;
  lastSeenAt: Date;
  lat: number;
  lng: number;
  stops: DetectedStop[];
  visitCount: number;
}

interface ObservedTrip {
  arrivalAt: Date;
  day: WeekdayName;
  departureAt: Date;
  destinationId: string;
  originId: string;
}

const EARTH_RADIUS_METERS = 6_371_000;
const WEEKDAYS: WeekdayName[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DEFAULT_ROUTE_DETECTION_OPTIONS: RouteDetectionOptions = {
  endpointClusterRadiusMeters: 200,
  maxAccuracyMeters: 120,
  maxSampleGapMs: 20 * 60 * 1000,
  maxTripDurationMs: 4 * 60 * 60 * 1000,
  minRouteRepeats: 3,
  minStopDurationMs: 15 * 60 * 1000,
  minStopSamples: 3,
  stopRadiusMeters: 150,
  timeZone: "UTC",
};

export function detectRecurringRoutes(
  samples: LocationSample[],
  options: Partial<RouteDetectionOptions> = {},
): RouteDetectionResult {
  const opts = { ...DEFAULT_ROUTE_DETECTION_OPTIONS, ...options };
  const normalized = normalizeSamples(samples, opts);
  const stops = detectStops(normalized, opts);
  const endpoints = clusterStops(stops, opts);
  const stopEndpointIds = assignStopsToEndpoints(stops, endpoints, opts);
  const recurringRoutes = detectRepeatedTrips(stops, endpoints, stopEndpointIds, opts);

  return {
    recurringRoutes,
    recurringEndpoints: endpoints.map(toRecurringEndpoint),
    stops,
  };
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function normalizeSamples(
  samples: LocationSample[],
  opts: RouteDetectionOptions,
): NormalizedSample[] {
  return samples
    .map((sample) => {
      const recordedAt = sample.recordedAt instanceof Date ? sample.recordedAt : new Date(sample.recordedAt);
      return { ...sample, recordedAt };
    })
    .filter((sample) => {
      if (!Number.isFinite(sample.lat) || !Number.isFinite(sample.lng)) {
        return false;
      }
      if (Number.isNaN(sample.recordedAt.getTime())) {
        return false;
      }
      return sample.accuracyMeters === undefined || sample.accuracyMeters <= opts.maxAccuracyMeters;
    })
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
}

function detectStops(samples: NormalizedSample[], opts: RouteDetectionOptions): DetectedStop[] {
  const stops: DetectedStop[] = [];
  let window: NormalizedSample[] = [];

  for (const sample of samples) {
    const previous = window.at(-1);
    const gapTooLarge =
      previous !== undefined && sample.recordedAt.getTime() - previous.recordedAt.getTime() > opts.maxSampleGapMs;

    if (window.length === 0 || gapTooLarge || distanceMeters(centroid(window), sample) > opts.stopRadiusMeters) {
      addStopIfValid(stops, window, opts);
      window = [sample];
      continue;
    }

    window.push(sample);
  }

  addStopIfValid(stops, window, opts);
  return stops;
}

function addStopIfValid(
  stops: DetectedStop[],
  samples: NormalizedSample[],
  opts: RouteDetectionOptions,
): void {
  if (samples.length < opts.minStopSamples) {
    return;
  }
  const first = samples[0];
  const last = samples.at(-1);
  if (!first || !last) {
    return;
  }
  const durationMs = last.recordedAt.getTime() - first.recordedAt.getTime();
  if (durationMs < opts.minStopDurationMs) {
    return;
  }
  const center = centroid(samples);
  stops.push({
    durationMs,
    endedAt: last.recordedAt.toISOString(),
    id: `stop_${stops.length + 1}`,
    lat: center.lat,
    lng: center.lng,
    sampleCount: samples.length,
    startedAt: first.recordedAt.toISOString(),
  });
}

function clusterStops(stops: DetectedStop[], opts: RouteDetectionOptions): MutableEndpoint[] {
  const endpoints: MutableEndpoint[] = [];

  for (const stop of stops) {
    const stopStartedAt = new Date(stop.startedAt);
    const stopEndedAt = new Date(stop.endedAt);
    const match = endpoints.find(
      (endpoint) => distanceMeters(endpoint, stop) <= opts.endpointClusterRadiusMeters,
    );

    if (!match) {
      endpoints.push({
        days: new Set([weekdayFor(stopStartedAt, opts.timeZone)]),
        firstSeenAt: stopStartedAt,
        id: `endpoint_${endpoints.length + 1}`,
        lastSeenAt: stopEndedAt,
        lat: stop.lat,
        lng: stop.lng,
        stops: [stop],
        visitCount: 1,
      });
      continue;
    }

    match.lat = (match.lat * match.visitCount + stop.lat) / (match.visitCount + 1);
    match.lng = (match.lng * match.visitCount + stop.lng) / (match.visitCount + 1);
    match.visitCount += 1;
    match.stops.push(stop);
    match.days.add(weekdayFor(stopStartedAt, opts.timeZone));
    if (stopStartedAt < match.firstSeenAt) {
      match.firstSeenAt = stopStartedAt;
    }
    if (stopEndedAt > match.lastSeenAt) {
      match.lastSeenAt = stopEndedAt;
    }
  }

  return endpoints.sort((a, b) => b.visitCount - a.visitCount);
}

function assignStopsToEndpoints(
  stops: DetectedStop[],
  endpoints: MutableEndpoint[],
  opts: RouteDetectionOptions,
): Map<string, string> {
  const assigned = new Map<string, string>();
  for (const stop of stops) {
    const endpoint = endpoints.find(
      (candidate) => distanceMeters(candidate, stop) <= opts.endpointClusterRadiusMeters,
    );
    if (endpoint) {
      assigned.set(stop.id, endpoint.id);
    }
  }
  return assigned;
}

function detectRepeatedTrips(
  stops: DetectedStop[],
  endpoints: MutableEndpoint[],
  stopEndpointIds: Map<string, string>,
  opts: RouteDetectionOptions,
): DetectedRecurringRoute[] {
  const endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]));
  const tripsByPair = new Map<string, ObservedTrip[]>();

  for (let i = 0; i < stops.length - 1; i += 1) {
    const originStop = stops[i];
    const destinationStop = stops[i + 1];
    if (!originStop || !destinationStop) {
      continue;
    }
    const originId = stopEndpointIds.get(originStop.id);
    const destinationId = stopEndpointIds.get(destinationStop.id);
    if (!originId || !destinationId || originId === destinationId) {
      continue;
    }

    const departureAt = new Date(originStop.endedAt);
    const arrivalAt = new Date(destinationStop.startedAt);
    const tripDurationMs = arrivalAt.getTime() - departureAt.getTime();
    if (tripDurationMs <= 0 || tripDurationMs > opts.maxTripDurationMs) {
      continue;
    }

    const key = `${originId}->${destinationId}`;
    const trips = tripsByPair.get(key) ?? [];
    trips.push({
      arrivalAt,
      day: weekdayFor(departureAt, opts.timeZone),
      departureAt,
      destinationId,
      originId,
    });
    tripsByPair.set(key, trips);
  }

  return [...tripsByPair.values()]
    .filter((trips) => trips.length >= opts.minRouteRepeats)
    .map((trips) => {
      const first = trips[0];
      if (!first) {
        return null;
      }
      const origin = endpointById.get(first.originId);
      const destination = endpointById.get(first.destinationId);
      if (!origin || !destination) {
        return null;
      }

      const days = sortWeekdays([...new Set(trips.map((trip) => trip.day))]);
      return {
        confidence: confidenceFor(trips, days, opts),
        daysOfWeek: days,
        destination: toRecurringEndpoint(destination),
        origin: toRecurringEndpoint(origin),
        tripCount: trips.length,
        typicalArrivalTime: typicalTime(trips.map((trip) => trip.arrivalAt), opts.timeZone),
        typicalDepartureTime: typicalTime(trips.map((trip) => trip.departureAt), opts.timeZone),
      };
    })
    .filter((route): route is DetectedRecurringRoute => route !== null)
    .sort((a, b) => b.confidence - a.confidence || b.tripCount - a.tripCount);
}

function centroid(samples: Array<{ lat: number; lng: number }>): { lat: number; lng: number } {
  const total = samples.reduce(
    (acc, sample) => ({ lat: acc.lat + sample.lat, lng: acc.lng + sample.lng }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: total.lat / samples.length,
    lng: total.lng / samples.length,
  };
}

function confidenceFor(
  trips: ObservedTrip[],
  days: WeekdayName[],
  opts: RouteDetectionOptions,
): number {
  const repeatScore = Math.min(0.55, trips.length / opts.minRouteRepeats * 0.25);
  const dayScore = Math.min(0.3, days.length / 5 * 0.3);
  const consistencyScore = timeConsistencyScore(trips, opts.timeZone) * 0.15;
  return Number(Math.min(1, repeatScore + dayScore + consistencyScore).toFixed(2));
}

function timeConsistencyScore(trips: ObservedTrip[], timeZone: string): number {
  const minutes = trips.map((trip) => minutesSinceMidnight(trip.departureAt, timeZone));
  const average = minutes.reduce((sum, value) => sum + value, 0) / minutes.length;
  const averageDeviation = minutes.reduce((sum, value) => sum + Math.abs(value - average), 0) / minutes.length;
  if (averageDeviation <= 15) {
    return 1;
  }
  if (averageDeviation >= 90) {
    return 0;
  }
  return 1 - (averageDeviation - 15) / 75;
}

function typicalTime(dates: Date[], timeZone: string): string {
  const averageMinutes = Math.round(
    dates.reduce((sum, date) => sum + minutesSinceMidnight(date, timeZone), 0) / dates.length,
  );
  const hours = Math.floor(averageMinutes / 60) % 24;
  const minutes = averageMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function minutesSinceMidnight(date: Date, timeZone: string): number {
  const parts = dateParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

function weekdayFor(date: Date, timeZone: string): WeekdayName {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(date).toLowerCase();
  return WEEKDAYS.includes(weekday as WeekdayName) ? (weekday as WeekdayName) : "monday";
}

function dateParts(date: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return { hour, minute };
}

function toRecurringEndpoint(endpoint: MutableEndpoint): RecurringEndpoint {
  return {
    daysOfWeek: sortWeekdays([...endpoint.days]),
    firstSeenAt: endpoint.firstSeenAt.toISOString(),
    id: endpoint.id,
    lastSeenAt: endpoint.lastSeenAt.toISOString(),
    lat: endpoint.lat,
    lng: endpoint.lng,
    visitCount: endpoint.visitCount,
  };
}

function sortWeekdays(days: WeekdayName[]): WeekdayName[] {
  return days.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}
