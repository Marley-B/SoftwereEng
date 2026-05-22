import { describe, expect, test } from "bun:test";

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
});
