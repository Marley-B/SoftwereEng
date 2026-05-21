import { describe, expect, test } from "bun:test";
import { detectRecurringRoutes, distanceMeters, type LocationSample } from "../src/routeDetection/index.js";

const home = { lat: 40.4168, lng: -3.7038 };
const work = { lat: 40.452, lng: -3.688 };

function stopSamples(
  center: { lat: number; lng: number },
  startIso: string,
  count = 4,
): LocationSample[] {
  const start = new Date(startIso).getTime();
  return Array.from({ length: count }, (_, index) => ({
    accuracyMeters: 20,
    lat: center.lat + index * 0.00003,
    lng: center.lng + index * 0.00003,
    recordedAt: new Date(start + index * 5 * 60 * 1000).toISOString(),
  }));
}

describe("route detection", () => {
  test("distanceMeters measures nearby coordinates in meters", () => {
    expect(distanceMeters(home, { lat: home.lat, lng: home.lng })).toBeLessThan(1);
    expect(distanceMeters(home, work)).toBeGreaterThan(3_000);
  });

  test("detectRecurringRoutes finds repeated endpoint pairs", () => {
    const samples: LocationSample[] = [
      ...stopSamples(home, "2026-05-18T06:45:00.000Z"),
      ...stopSamples(work, "2026-05-18T07:35:00.000Z"),
      ...stopSamples(home, "2026-05-19T06:50:00.000Z"),
      ...stopSamples(work, "2026-05-19T07:42:00.000Z"),
      ...stopSamples(home, "2026-05-20T06:55:00.000Z"),
      ...stopSamples(work, "2026-05-20T07:46:00.000Z"),
    ];

    const result = detectRecurringRoutes(samples, { timeZone: "Europe/Madrid" });

    expect(result.stops).toHaveLength(6);
    expect(result.recurringEndpoints).toHaveLength(2);
    expect(result.recurringRoutes).toHaveLength(1);
    expect(result.recurringRoutes[0].tripCount).toBe(3);
    expect(result.recurringRoutes[0].daysOfWeek).toEqual(["monday", "tuesday", "wednesday"]);
    expect(result.recurringRoutes[0].typicalDepartureTime).toMatch(/^\d{2}:\d{2}$/);
  });

  test("detectRecurringRoutes ignores low-confidence one-off trips", () => {
    const samples: LocationSample[] = [
      ...stopSamples(home, "2026-05-18T06:45:00.000Z"),
      ...stopSamples(work, "2026-05-18T07:35:00.000Z"),
    ];

    const result = detectRecurringRoutes(samples, { timeZone: "Europe/Madrid" });

    expect(result.stops).toHaveLength(2);
    expect(result.recurringRoutes).toHaveLength(0);
  });
});
