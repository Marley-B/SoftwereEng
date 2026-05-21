import { z } from "zod";

export interface PlaceRef {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

export const placeRefSchema = z.object({
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  placeId: z.string().min(1)
});

/** One leg segment in a transit alternative (walk vs transit vehicle). */
export const transitSegmentSchema = z.object({
  kind: z.enum(["walk", "transit"]),
  modeLabel: z.string().min(1),
  line: z.string().min(1),
  detail: z.string().optional()
});

/** One selectable alternative from Google Routes (TRANSIT). */
export const transitOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  durationSeconds: z.number().int().nonnegative(),
  staticDurationSeconds: z.number().int().nonnegative().optional(),
  /** Walk / transit breakdown for UI (optional for older API responses). */
  segments: z.array(transitSegmentSchema).optional(),
  /** Opaque payload echoed on create/update so the server can persist the chosen route slice. */
  payload: z.record(z.unknown())
});

export type TransitOption = z.infer<typeof transitOptionSchema>;

/** Persisted with the route for worker replay and UI. */
export const transitSnapshotSchema = z.object({
  optionsRequest: z.object({
    departureIso: z.string().min(1),
    timeZone: z.string().min(1)
  }),
  selectedOptionId: z.string().min(1),
  selectedPayload: z.record(z.unknown()),
  /** Baseline duration (seconds) at selection time for delay heuristics. */
  baselineDurationSeconds: z.number().int().nonnegative(),
  baselineStaticDurationSeconds: z.number().int().nonnegative().optional()
});

export type TransitSnapshot = z.infer<typeof transitSnapshotSchema>;

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(120)
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authUserDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1)
});

export const authResponseSchema = z.object({
  token: z.string().min(1),
  user: authUserDtoSchema
});

export const transitOptionsBodySchema = z.object({
  origin: placeRefSchema,
  destination: placeRefSchema,
  /** ISO 8601 instant for when the user intends to depart (API derives RFC3339 for Google). */
  departureIso: z.string().min(1),
  timeZone: z.string().min(1)
});

export const transitOptionsResponseSchema = z.object({
  options: z.array(transitOptionSchema)
});

export const routeCreateBodySchema = z.object({
  name: z.string().min(1).max(200),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/),
  expectedArrival: z.string().regex(/^\d{1,2}:\d{2}$/),
  timeZone: z.string().min(1),
  departureLabel: z.string().min(1),
  destinationLabel: z.string().min(1),
  origin: placeRefSchema,
  destination: placeRefSchema,
  transitSnapshot: transitSnapshotSchema,
  daysOfWeek: z.array(z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ])).min(1)
});

export const routeUpdateBodySchema = routeCreateBodySchema.partial();

export const routeResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  startTime: z.string(),
  expectedArrival: z.string(),
  timeZone: z.string(),
  departure: z.string(),
  destination: z.string(),
  origin: placeRefSchema,
  destinationPlace: placeRefSchema,
  transitSnapshot: transitSnapshotSchema,
  daysOfWeek: z.array(z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ])).min(1)
});

export type RouteResponse = z.infer<typeof routeResponseSchema>;

export const disruptionResponseSchema = z.object({
  id: z.string().uuid(),
  occurredAt: z.string(),
  description: z.string(),
  severity: z.string(),
  routeId: z.string().uuid().nullable(),
  affectedRoutes: z.array(z.string())
});

export type DisruptionResponse = z.infer<typeof disruptionResponseSchema>;

export const pushTokenBodySchema = z.object({
  expoPushToken: z.string().min(1),
  deviceId: z.string().optional()
});

export type RouteCreateBody = z.infer<typeof routeCreateBodySchema>;
export type RouteUpdateBody = z.infer<typeof routeUpdateBodySchema>;

export {
  departureInstantForLocalWallClock,
  isPredictedArrivalWithinSlack,
  localDateStringInZone
} from "./arrival";

export {
  DEFAULT_ROUTE_DETECTION_OPTIONS,
  detectRecurringRoutes,
  distanceMeters,
  type DetectedRecurringRoute,
  type LocationSample
} from "./routeDetection/index";
