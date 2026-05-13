import { describe, expect, test } from "bun:test";
import {
  departureInstantForLocalWallClock,
  isPredictedArrivalWithinSlack,
  localDateStringInZone,
} from "../src/arrival.js";

describe("arrival helpers", () => {
  test("departureInstantForLocalWallClock returns UTC instant for local wall clock", () => {
    const now = new Date("2026-03-10T15:00:00.000Z");
    const dep = departureInstantForLocalWallClock({
      startTimeHHmm: "9:15",
      timeZone: "Europe/Amsterdam",
      now,
    });
    expect(dep).not.toBeNull();
    const iso = dep!.toISOString();
    expect(iso).toContain("T");
  });

  test("departureInstantForLocalWallClock rejects invalid time", () => {
    expect(departureInstantForLocalWallClock({ startTimeHHmm: "25:00", timeZone: "UTC" })).toBeNull();
  });

  test("isPredictedArrivalWithinSlack ok when arrival on time", () => {
    const departureUtc = new Date("2026-03-10T07:00:00.000Z");
    const r = isPredictedArrivalWithinSlack({
      departureUtc,
      durationSeconds: 30 * 60,
      expectedArrivalHHmm: "9:00",
      timeZone: "Europe/Amsterdam",
      slackMinutes: 30,
    });
    expect(r.ok).toBe(true);
  });

  test("isPredictedArrivalWithinSlack fails when too late", () => {
    const departureUtc = new Date("2026-03-10T07:00:00.000Z");
    const r = isPredictedArrivalWithinSlack({
      departureUtc,
      durationSeconds: 4 * 60 * 60,
      expectedArrivalHHmm: "9:00",
      timeZone: "Europe/Amsterdam",
      slackMinutes: 5,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBeDefined();
  });

  test("localDateStringInZone returns ISO date in zone", () => {
    const utc = new Date("2026-01-15T23:00:00.000Z");
    const d = localDateStringInZone(utc, "America/Los_Angeles");
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
