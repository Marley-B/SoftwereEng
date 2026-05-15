export interface GoogleApiQuotaConfig {
  enabled: boolean;
  maxPerPlacesSession: number;
  maxTransitPerUserPerHour: number;
  placesSessionTtlMs: number;
}

export type GoogleApiQuotaKind = "places_session" | "transit_hour";

export interface GoogleApiQuotaReject {
  ok: false;
  kind: GoogleApiQuotaKind;
  limit: number;
  used: number;
}

export interface GoogleApiQuotaOk {
  ok: true;
}

export type GoogleApiQuotaResult = GoogleApiQuotaOk | GoogleApiQuotaReject;

interface CounterEntry {
  count: number;
  expiresAt: number;
}

function placesKey(userId: string, sessionToken: string): string {
  const token = sessionToken.trim() || "_no_session";
  return `${userId}:${token}`;
}

/** In-memory Google API usage caps (per process; resets on API restart). */
export class GoogleApiQuota {
  private readonly placesByKey = new Map<string, CounterEntry>();
  private readonly transitByUser = new Map<string, CounterEntry>();

  constructor(private readonly config: GoogleApiQuotaConfig) {}

  consumePlaces(userId: string, sessionToken: string): GoogleApiQuotaResult {
    if (!this.config.enabled) {
      return { ok: true };
    }
    return this.consume(
      this.placesByKey,
      placesKey(userId, sessionToken),
      this.config.maxPerPlacesSession,
      this.config.placesSessionTtlMs,
      "places_session",
    );
  }

  consumeTransit(userId: string): GoogleApiQuotaResult {
    if (!this.config.enabled) {
      return { ok: true };
    }
    const hourMs = 60 * 60 * 1000;
    return this.consume(
      this.transitByUser,
      userId,
      this.config.maxTransitPerUserPerHour,
      hourMs,
      "transit_hour",
    );
  }

  private consume(
    map: Map<string, CounterEntry>,
    key: string,
    limit: number,
    ttlMs: number,
    kind: GoogleApiQuotaKind,
  ): GoogleApiQuotaResult {
    const now = Date.now();
    this.pruneExpired(map, now);

    let entry = map.get(key);
    if (entry === undefined || entry.expiresAt <= now) {
      entry = { count: 0, expiresAt: now + ttlMs };
      map.set(key, entry);
    }

    if (entry.count >= limit) {
      return { ok: false, kind, limit, used: entry.count };
    }

    entry.count += 1;
    return { ok: true };
  }

  private pruneExpired(map: Map<string, CounterEntry>, now: number): void {
    for (const [key, entry] of map) {
      if (entry.expiresAt <= now) {
        map.delete(key);
      }
    }
  }
}

export function quotaExceededMessage(reject: GoogleApiQuotaReject): string {
  if (reject.kind === "places_session") {
    return `Google Places quota exceeded for this search session (${reject.limit} requests). Finish selecting a place or start a new search.`;
  }
  return `Google Routes quota exceeded (${reject.limit} requests per hour). Try again later.`;
}

export function parseGoogleApiQuotaConfig(env: NodeJS.ProcessEnv = process.env): GoogleApiQuotaConfig {
  const enabled = parseBool(env.GOOGLE_API_QUOTA_ENABLED, true);
  return {
    enabled,
    maxPerPlacesSession: parsePositiveInt(env.GOOGLE_API_MAX_PER_PLACES_SESSION, 50),
    maxTransitPerUserPerHour: parsePositiveInt(env.GOOGLE_API_MAX_TRANSIT_PER_USER_PER_HOUR, 40),
    placesSessionTtlMs: parsePositiveInt(env.GOOGLE_API_PLACES_SESSION_TTL_MS, 30 * 60 * 1000),
  };
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") {
    return true;
  }
  if (v === "0" || v === "false" || v === "no" || v === "off") {
    return false;
  }
  return fallback;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return n;
}
