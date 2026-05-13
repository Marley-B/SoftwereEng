import { describe, expect, test } from "bun:test";
import {
  formatRouteTime,
  parseRouteTime,
  scheduledCommuteWindowSeconds,
} from "../src/features/routes/routeTimeUtils.js";

describe("routeTimeUtils", () => {
  test("formatRouteTime pads minutes", () => {
    const d = new Date(2026, 4, 1, 9, 5, 0);
    expect(formatRouteTime(d)).toBe("9:05");
  });

  test("parseRouteTime parses H:mm", () => {
    const base = new Date(2026, 4, 1, 0, 0, 0);
    const d = parseRouteTime("14:30", base);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  test("scheduledCommuteWindowSeconds handles same-day window", () => {
    const s = scheduledCommuteWindowSeconds("8:00", "9:00");
    expect(s).toBe(3600);
  });

  test("scheduledCommuteWindowSeconds treats earlier arrival as next day", () => {
    const s = scheduledCommuteWindowSeconds("22:00", "6:00");
    expect(s).toBe(8 * 3600);
  });

  test("scheduledCommuteWindowSeconds returns null for identical times", () => {
    expect(scheduledCommuteWindowSeconds("7:00", "7:00")).toBeNull();
  });
});
