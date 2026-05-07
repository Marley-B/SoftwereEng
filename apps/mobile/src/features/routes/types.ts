/** Transit route shown on home; IDs align with future API entities. */
export interface Route {
  id: string;
  name: string;
  startTime: string;
  expectedArrival: string;
  departure: string;
  destination: string;
}

/** Payload for create/update before an id is assigned (add flow). */
export interface RouteDraft {
  departure: string;
  destination: string;
  expectedArrival: string;
  name: string;
  startTime: string;
}
