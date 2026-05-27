import { describe, expect, test } from "bun:test";

import { decodePolyline, extractEncodedPolylines } from "../src/features/routes/components/routeMapUtils.js";

describe("extractEncodedPolylines", () => {
  test("finds top-level and nested route polylines", () => {
    expect(
      extractEncodedPolylines({
        polyline: { encodedPolyline: "abc123" },
        legs: [
          {
            steps: [
              { polyline: { points: "step-1" } },
              { polyline: { encodedPolyline: "step-2" } },
            ],
          },
        ],
      }),
    ).toEqual(["abc123", "step-1", "step-2"]);
  });

  test("returns empty array for missing payload", () => {
    expect(extractEncodedPolylines(null)).toEqual([]);
    expect(extractEncodedPolylines({ legs: [] })).toEqual([]);
  });

  test("decodes an encoded polyline", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ]);
  });
});
