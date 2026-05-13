/**
 * Smoke test: job completes with an empty routes table (no route rows → no Google calls).
 */
import "dotenv/config";
import { beforeAll, describe, expect, test } from "bun:test";
import { createDb, runMigrations } from "@route-helper/db";

import { runDueRouteChecks } from "../src/jobs/runDueRouteChecks.js";

const databaseUrl = process.env.DATABASE_URL;
const googleKey =
  process.env.GOOGLE_ROUTES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "placeholder-key";
const shouldRun = Boolean(databaseUrl);
const describeIntegration = shouldRun ? describe : describe.skip;

describeIntegration("runDueRouteChecks (integration smoke)", () => {
  let db: ReturnType<typeof createDb>;

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    db = createDb(databaseUrl!);
  });

  test("resolves without throwing when there are no routes", async () => {
    await expect(runDueRouteChecks({ db, googleApiKey: googleKey })).resolves.toBeUndefined();
  });
});
