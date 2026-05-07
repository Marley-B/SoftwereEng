/** Transit route shown on home; IDs align with future API entities. */
export interface Route {
  id: string;
  name: string;
  startTime: string;
  expectedArrival: string;
  departure: string;
  destination: string;
}
