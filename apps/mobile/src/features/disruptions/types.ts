import type { RouteSuggestion } from "@route-helper/shared";

/** A reported disruption affecting one or more transit routes. */
export interface Disruption {
  id: string;
  /** ISO 8601 timestamp of when the disruption occurred. */
  occurredAt: string;
  description: string;
  /** The saved route this disruption belongs to, if any. */
  routeId: string | null;
  /** Real-time alternative computed when the disruption was detected. */
  suggestedAlternative?: RouteSuggestion | null;
  /** Route names or identifiers affected by this disruption. */
  affectedRoutes: string[];
}
