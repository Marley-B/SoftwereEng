import type { TransitSegmentSummary } from "./transitStepSummary";
import { summarizeTransitLegs } from "./transitStepSummary";

const COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

/** Minimal Google Routes v2 route object we parse. */
interface GoogleRoute {
  duration?: string;
  staticDuration?: string;
  polyline?: {
    encodedPolyline?: string;
  };
  localizedValues?: {
    duration?: { text?: string };
    staticDuration?: { text?: string };
  };
  legs?: unknown[];
}

interface ComputeRoutesResponse {
  routes?: GoogleRoute[];
}

function parseDurationSeconds(duration: string | undefined): number | undefined {
  if (!duration || !duration.endsWith("s")) {
    return undefined;
  }
  const n = Number.parseInt(duration.replace("s", ""), 10);
  return Number.isNaN(n) ? undefined : n;
}

function buildLabel(route: GoogleRoute): string {
  const loc = route.localizedValues?.duration?.text;
  if (loc) {
    return loc;
  }
  const sec = parseDurationSeconds(route.duration);
  if (sec !== undefined) {
    const m = Math.round(sec / 60);
    return `~${m} min`;
  }
  return "Transit route";
}

export interface ComputeTransitRoutesParams {
  apiKey: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  /** RFC3339 UTC */
  departureTimeRfc3339: string;
  computeAlternativeRoutes?: boolean;
}

export interface ParsedTransitOption {
  id: string;
  label: string;
  durationSeconds: number;
  staticDurationSeconds?: number | undefined;
  /** Walk / transit segments for UI (Google Maps–style breakdown). */
  segments?: TransitSegmentSummary[];
  payload: Record<string, unknown>;
}

/**
 * Calls Google Routes API computeRoutes (TRANSIT) and returns parsed alternatives.
 */
export const computeTransitRouteOptions = async (
  params: ComputeTransitRoutesParams
): Promise<ParsedTransitOption[]> => {
  const body = {
    origin: { location: { latLng: { latitude: params.origin.lat, longitude: params.origin.lng } } },
    destination: {
      location: { latLng: { latitude: params.destination.lat, longitude: params.destination.lng } }
    },
    travelMode: "TRANSIT",
    polylineQuality: "HIGH_QUALITY",
    polylineEncoding: "ENCODED_POLYLINE",
    departureTime: params.departureTimeRfc3339,
    computeAlternativeRoutes: params.computeAlternativeRoutes ?? true,
    languageCode: "en",
    units: "METRIC"
  };

  const res = await fetch(COMPUTE_ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.apiKey,
      // Include full steps so we can read travelMode, transitDetails (line, vehicle, stops), and walk instructions.
      "X-Goog-FieldMask":
        "routes.duration,routes.staticDuration,routes.localizedValues,routes.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.navigationInstruction,routes.legs.steps.localizedValues,routes.legs.steps.transitDetails,routes.legs.steps.polyline"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Routes API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as ComputeRoutesResponse;
  const routeList = json.routes ?? [];
  return routeList.map((route, index) => {
    const durationSeconds = parseDurationSeconds(route.duration) ?? 0;
    const staticDurationSeconds = parseDurationSeconds(route.staticDuration);
    const id = `alt-${index}`;
    const segments = summarizeTransitLegs(route.legs);
    return {
      id,
      label: buildLabel(route),
      durationSeconds,
      ...(staticDurationSeconds !== undefined ? { staticDurationSeconds } : {}),
      ...(segments.length > 0 ? { segments } : {}),
      payload: {
        index,
        duration: route.duration,
        staticDuration: route.staticDuration,
        polyline: route.polyline,
        legs: route.legs
      }
    } satisfies ParsedTransitOption;
  });
};

export interface EvaluateTransitCheckParams {
  apiKey: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  departureTimeRfc3339: string;
  /** Baseline duration from when the user saved the route (seconds). */
  baselineDurationSeconds: number;
  baselineStaticDurationSeconds?: number;
  /** Max allowed increase vs baseline before treating as disruption (e.g. 0.25 = +25%). */
  delayRatioThreshold?: number;
}

export interface TransitCheckResult {
  ok: boolean;
  summary: string;
  durationSeconds?: number | undefined;
  staticDurationSeconds?: number | undefined;
}

/**
 * Recomputes a single primary transit route and applies heuristics vs saved baseline.
 */
export const evaluateTransitRouteCheck = async (
  params: EvaluateTransitCheckParams
): Promise<TransitCheckResult> => {
  const options = await computeTransitRouteOptions({
    apiKey: params.apiKey,
    origin: params.origin,
    destination: params.destination,
    departureTimeRfc3339: params.departureTimeRfc3339,
    computeAlternativeRoutes: false
  });
  const primary = options[0];
  if (!primary) {
    return { ok: false, summary: "No transit route returned" };
  }
  const durationSeconds = primary.durationSeconds;
  const staticDurationSeconds = primary.staticDurationSeconds ?? params.baselineStaticDurationSeconds;
  const ratioThreshold = params.delayRatioThreshold ?? 0.25;
  const maxAllowed = Math.ceil(params.baselineDurationSeconds * (1 + ratioThreshold));
  if (durationSeconds > maxAllowed) {
    return {
      ok: false,
      summary: `Trip duration increased significantly (~${durationSeconds}s vs baseline ${params.baselineDurationSeconds}s)`,
      durationSeconds,
      ...(staticDurationSeconds !== undefined ? { staticDurationSeconds } : {})
    } satisfies TransitCheckResult;
  }
  if (
    staticDurationSeconds !== undefined &&
    params.baselineStaticDurationSeconds !== undefined &&
    durationSeconds - staticDurationSeconds >
      Math.max(120, (params.baselineStaticDurationSeconds ?? 0) * 0.15)
  ) {
    return {
      ok: false,
      summary: "Live duration exceeds static estimate — possible disruption",
      durationSeconds,
      ...(staticDurationSeconds !== undefined ? { staticDurationSeconds } : {})
    } satisfies TransitCheckResult;
  }
  return {
    ok: true,
    summary: "Route looks OK",
    durationSeconds,
    ...(staticDurationSeconds !== undefined ? { staticDurationSeconds } : {})
  } satisfies TransitCheckResult;
};
