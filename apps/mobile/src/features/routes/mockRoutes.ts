import type { Route } from "./types";

/** Static payload until a real `/routes` exists — swap `fetchRoutes` body only. */
const MOCK_ROUTES: Route[] = [
  {
    id: "route-1",
    name: "Campus loop",
    departure: "9:15",
    destination: "Science Building",
    expectedArrival: "10:00",
    startTime: "9:00",
  },
  {
    id: "route-2",
    name: "Downtown express",
    departure: "14:30",
    destination: "Central Station",
    expectedArrival: "15:05",
    startTime: "14:15",
  },
  {
    id: "route-3",
    name: "Evening return",
    departure: "17:45",
    destination: "Riverside dorm",
    expectedArrival: "18:20",
    startTime: "17:30",
  },
];

/** Simulates network latency; replace with `fetch` when backend is ready. */
export async function fetchRoutes(): Promise<Route[]> {
  await new Promise((r) => setTimeout(r, 450));
  return [...MOCK_ROUTES];
}
