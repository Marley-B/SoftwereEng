import { describe, expect, test } from "bun:test";

import { computeTransitRouteOptions, suggestTransitAlternativeRoute } from "../src/index.js";
import { summarizeTransitLegs } from "../src/transitStepSummary.js";

describe("summarizeTransitLegs", () => {
  test("returns empty array for non-array input", () => {
    expect(summarizeTransitLegs(null)).toEqual([]);
    expect(summarizeTransitLegs({})).toEqual([]);
  });

  test("maps walk and transit steps from Google Routes leg shape", () => {
    const legs = [
      {
        steps: [
          {
            travelMode: "WALK",
            navigationInstruction: { instructions: "Walk to stop" },
            localizedValues: { staticDuration: { text: "5 min" } },
          },
          {
            travelMode: "TRANSIT",
            transitDetails: {
              headsign: "Central",
              transitLine: {
                nameShort: "M1",
                vehicle: { type: "SUBWAY" },
              },
              stopDetails: {
                departureStop: { name: "A" },
                arrivalStop: { name: "B" },
              },
            },
          },
        ],
      },
    ];

    const segments = summarizeTransitLegs(legs);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ kind: "walk", modeLabel: "Walk" });
    expect(segments[1]).toMatchObject({ kind: "transit", line: "M1" });
  });

  test("requests encoded high-quality polylines and preserves them in the payload", async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody: unknown = null;

    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(
        JSON.stringify({
          routes: [
            {
              duration: "900s",
              polyline: { encodedPolyline: "abc123" },
              legs: [],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    try {
      const options = await computeTransitRouteOptions({
        apiKey: "test-key",
        origin: { lat: 1, lng: 2 },
        destination: { lat: 3, lng: 4 },
        departureTimeRfc3339: "2026-05-23T10:00:00Z",
      });

      expect(capturedBody).toMatchObject({
        travelMode: "TRANSIT",
        polylineQuality: "HIGH_QUALITY",
        polylineEncoding: "ENCODED_POLYLINE",
      });
      expect(options[0]?.payload).toMatchObject({
        polyline: { encodedPolyline: "abc123" },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("suggestTransitAlternativeRoute returns fastest useful live alternative", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          routes: [
            { duration: "2200s", legs: [] },
            { duration: "1500s", localizedValues: { duration: { text: "25 min" } }, legs: [] },
            { duration: "1800s", legs: [] },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    try {
      const suggestion = await suggestTransitAlternativeRoute({
        apiKey: "test-key",
        origin: { lat: 1, lng: 2 },
        destination: { lat: 3, lng: 4 },
        departureTimeRfc3339: "2026-05-23T10:00:00Z",
        currentDurationSeconds: 2200,
        selectedOptionId: "alt-0",
      });

      expect(suggestion).toMatchObject({
        id: "alt-1",
        durationSeconds: 1500,
        savingsSeconds: 700,
        summary: "Saves about 12 min with 25 min",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
