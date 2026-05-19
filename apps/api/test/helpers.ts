import "dotenv/config";
import type { Database } from "@route-helper/db";
import { createDb, runMigrations } from "@route-helper/db";
import type { FastifyInstance } from "fastify";
import { describe } from "bun:test";

import { buildApp, type BuildAppOptions } from "../src/app.js";
import type { GoogleApiQuotaConfig } from "../src/lib/googleApiQuota.js";

export const hasDatabase = Boolean(process.env.DATABASE_URL);
export const jwtSecret = process.env.JWT_SECRET ?? "integration-test-jwt-secret";
export const googleRoutesApiKey =
  process.env.GOOGLE_ROUTES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "test-google-key-placeholder";

/** Skip entire describe blocks when Postgres is not configured (e.g. CI without DATABASE_URL). */
export const describeIntegration = hasDatabase ? describe : describe.skip;

export async function createIntegrationApp(
  overrides: Pick<BuildAppOptions, "googleApiQuota" | "googleApiQuotaConfig"> = {},
): Promise<{ app: FastifyInstance; db: Database }> {
  const databaseUrl = process.env.DATABASE_URL!;
  await runMigrations(databaseUrl);
  const db = createDb(databaseUrl);
  const app = buildApp({ db, jwtSecret, googleRoutesApiKey, ...overrides });
  await app.ready();
  return { app, db };
}

export const tightGoogleApiQuotaConfig: GoogleApiQuotaConfig = {
  enabled: true,
  maxPerPlacesSession: 2,
  maxTransitPerUserPerHour: 1,
  placesSessionTtlMs: 60_000,
};

export function minimalPlaceRef(suffix: string) {
  return {
    address: `Integration test ${suffix}`,
    lat: 40.7128,
    lng: -74.006,
    placeId: `place_${suffix}_xxxxxxxxxx`.slice(0, 32),
  };
}

export function minimalTransitSnapshot() {
  return {
    optionsRequest: {
      departureIso: "2026-06-01T12:00:00.000Z",
      timeZone: "Europe/Amsterdam",
    },
    selectedOptionId: "stub-option-id",
    selectedPayload: { stub: true },
    baselineDurationSeconds: 3600,
  };
}

export function minimalRouteCreateBody(routeName: string, unique: string) {
  const origin = minimalPlaceRef(`${unique}_o`);
  const destination = minimalPlaceRef(`${unique}_d`);
  return {
    name: routeName,
    startTime: "8:00",
    expectedArrival: "9:30",
    timeZone: "Europe/Amsterdam",
    departureLabel: "Home",
    destinationLabel: "Work",
    daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    origin,
    destination: { ...destination, lat: origin.lat + 0.02 },
    transitSnapshot: minimalTransitSnapshot(),
  };
}
