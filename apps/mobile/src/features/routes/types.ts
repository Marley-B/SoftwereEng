import type {
  PlaceRef,
  RouteCreateBody,
  RouteUpdateBody,
  TransitSnapshot,
} from "@route-helper/shared";

/** Transit route shown on home (API shape subset + client fields). */
export interface Route {
  id: string;
  name: string;
  startTime: string;
  expectedArrival: string;
  departure: string;
  destination: string;
  timeZone: string;
  origin: PlaceRef;
  destinationPlace: PlaceRef;
  transitSnapshot: TransitSnapshot;
}

export type { RouteCreateBody, RouteUpdateBody };

/** @deprecated Legacy mock shape — prefer RouteCreateBody in new flows. */
export interface RouteDraft {
  departure: string;
  destination: string;
  expectedArrival: string;
  name: string;
  startTime: string;
}
