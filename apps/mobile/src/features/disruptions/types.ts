/** A reported disruption affecting one or more transit routes. */
export interface Disruption {
  id: string;
  /** ISO 8601 timestamp of when the disruption occurred. */
  occurredAt: string;
  description: string;
  /** The saved route this disruption belongs to, if any. */
  routeId: string | null;
  /** Route names or identifiers affected by this disruption. */
  affectedRoutes: string[];
}
