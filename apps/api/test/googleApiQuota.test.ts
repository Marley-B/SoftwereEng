import { describe, expect, test } from "bun:test";

import {
  GoogleApiQuota,
  parseGoogleApiQuotaConfig,
  quotaExceededMessage,
} from "../src/lib/googleApiQuota.js";

describe("GoogleApiQuota", () => {
  const config = {
    enabled: true,
    maxPerPlacesSession: 3,
    maxTransitPerUserPerHour: 2,
    placesSessionTtlMs: 60_000,
  };

  test("allows requests under the places session limit", () => {
    const quota = new GoogleApiQuota(config);
    expect(quota.consumePlaces("u1", "sess-a")).toEqual({ ok: true });
    expect(quota.consumePlaces("u1", "sess-a")).toEqual({ ok: true });
    expect(quota.consumePlaces("u1", "sess-a")).toEqual({ ok: true });
  });

  test("rejects when places session limit is reached", () => {
    const quota = new GoogleApiQuota(config);
    quota.consumePlaces("u1", "sess-a");
    quota.consumePlaces("u1", "sess-a");
    quota.consumePlaces("u1", "sess-a");
    const fourth = quota.consumePlaces("u1", "sess-a");
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) {
      expect(fourth.kind).toBe("places_session");
      expect(fourth.limit).toBe(3);
      expect(fourth.used).toBe(3);
    }
  });

  test("isolates places counters by session token and user", () => {
    const quota = new GoogleApiQuota(config);
    quota.consumePlaces("u1", "sess-a");
    quota.consumePlaces("u1", "sess-a");
    quota.consumePlaces("u1", "sess-a");
    expect(quota.consumePlaces("u1", "sess-b")).toEqual({ ok: true });
    expect(quota.consumePlaces("u2", "sess-a")).toEqual({ ok: true });
  });

  test("rejects when transit hourly limit is reached", () => {
    const quota = new GoogleApiQuota(config);
    expect(quota.consumeTransit("u1")).toEqual({ ok: true });
    expect(quota.consumeTransit("u1")).toEqual({ ok: true });
    const third = quota.consumeTransit("u1");
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.kind).toBe("transit_hour");
    }
  });

  test("skips counting when disabled", () => {
    const quota = new GoogleApiQuota({ ...config, enabled: false });
    for (let i = 0; i < 10; i += 1) {
      expect(quota.consumePlaces("u1", "sess-a")).toEqual({ ok: true });
    }
  });
});

describe("parseGoogleApiQuotaConfig", () => {
  test("parses env overrides", () => {
    const cfg = parseGoogleApiQuotaConfig({
      GOOGLE_API_QUOTA_ENABLED: "false",
      GOOGLE_API_MAX_PER_PLACES_SESSION: "12",
      GOOGLE_API_MAX_TRANSIT_PER_USER_PER_HOUR: "7",
      GOOGLE_API_PLACES_SESSION_TTL_MS: "900000",
    });
    expect(cfg).toEqual({
      enabled: false,
      maxPerPlacesSession: 12,
      maxTransitPerUserPerHour: 7,
      placesSessionTtlMs: 900_000,
    });
  });
});

describe("quotaExceededMessage", () => {
  test("includes limit for places session rejections", () => {
    const msg = quotaExceededMessage({
      ok: false,
      kind: "places_session",
      limit: 50,
      used: 50,
    });
    expect(msg).toContain("50");
    expect(msg).toContain("search session");
  });
});
