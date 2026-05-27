/**
 * Integration test: worker creates disruptions and route check runs for due routes.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb, disruptions, routeCheckRuns, runMigrations, users } from "@route-helper/db";

import { runDueRouteChecks } from "../src/jobs/runDueRouteChecks.js";
import { createWorkerRouteFixture, dueCheckNow } from "./helpers.js";

const databaseUrl = process.env.DATABASE_URL;
const googleKey =
  process.env.GOOGLE_ROUTES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "placeholder-key";
const shouldRun = Boolean(databaseUrl);
const describeIntegration = shouldRun ? describe : describe.skip;

describeIntegration("runDueRouteChecks (integration)", () => {
  let db: ReturnType<typeof createDb>;
  const cleanupUserIds: string[] = [];

  beforeAll(async () => {
    await runMigrations(databaseUrl!);
    db = createDb(databaseUrl!);
  });

  afterAll(async () => {
    for (const userId of cleanupUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  test("creates a disruption, records the run, and notifies push tokens", async () => {
    const unique = `worker-int-${Date.now()}`;
    const { routeId, userId } = await createWorkerRouteFixture({ db, unique });
    cleanupUserIds.push(userId);

    const notifications: Array<{ title: string; body: string; routeId: unknown }> = [];
    await expect(
      runDueRouteChecks({
        db,
        googleApiKey: googleKey,
        now: dueCheckNow,
        evaluateRouteCheck: async () => ({
          ok: false,
          summary: "Simulated worker disruption",
        }),
        sendPushNotification: async (payload) => {
          notifications.push({
            title: payload.title,
            body: payload.body,
            routeId: payload.data?.routeId,
          });
        },
      }),
    ).resolves.toBeUndefined();

    const disruptionRows = await db
      .select({
        description: disruptions.description,
        severity: disruptions.severity,
        routeId: disruptions.routeId,
      })
      .from(disruptions)
      .where(eq(disruptions.routeId, routeId));
    expect(disruptionRows.some((row) => row.description.includes("Simulated worker disruption"))).toBe(true);
    expect(disruptionRows.some((row) => row.severity === "warn")).toBe(true);

    const runRows = await db
      .select({
        offsetMinutes: routeCheckRuns.offsetMinutes,
        result: routeCheckRuns.result,
      })
      .from(routeCheckRuns)
      .where(eq(routeCheckRuns.routeId, routeId));
    expect(runRows).toContainEqual({
      offsetMinutes: -5,
      result: "fail",
    });

    expect(
      notifications.some(
        (payload) =>
          payload.title === "Route disruption" &&
          payload.body.includes("Simulated worker disruption") &&
          payload.routeId === routeId,
      ),
    ).toBe(true);
  });

  test("records an ok check without creating disruption or notification", async () => {
    const unique = `worker-ok-${Date.now()}`;
    const { routeId, userId } = await createWorkerRouteFixture({ db, unique });
    cleanupUserIds.push(userId);

    const notifications: string[] = [];
    await runDueRouteChecks({
      db,
      googleApiKey: googleKey,
      now: dueCheckNow,
      evaluateRouteCheck: async () => ({
        ok: true,
        summary: "Route looks OK",
        durationSeconds: 85 * 60,
      }),
      sendPushNotification: async (payload) => {
        notifications.push(payload.title);
      },
    });

    const disruptionRows = await db
      .select({ id: disruptions.id })
      .from(disruptions)
      .where(eq(disruptions.routeId, routeId));
    expect(disruptionRows).toHaveLength(0);

    const runRows = await db
      .select({
        offsetMinutes: routeCheckRuns.offsetMinutes,
        result: routeCheckRuns.result,
      })
      .from(routeCheckRuns)
      .where(eq(routeCheckRuns.routeId, routeId));
    expect(runRows).toContainEqual({
      offsetMinutes: -5,
      result: "ok",
    });
    expect(notifications).toHaveLength(0);
  });

  test("marks slight lateness as possible delay and uses info severity", async () => {
    const unique = `worker-info-${Date.now()}`;
    const { routeId, userId } = await createWorkerRouteFixture({ db, unique });
    cleanupUserIds.push(userId);

    const notifications: Array<{ title: string; body: string }> = [];
    await runDueRouteChecks({
      db,
      googleApiKey: googleKey,
      now: dueCheckNow,
      evaluateRouteCheck: async () => ({
        ok: true,
        summary: "Route looks OK",
        // 8:00 + 96m => 9:36, which is outside +5m slack but within +10m slack.
        durationSeconds: 96 * 60,
      }),
      sendPushNotification: async (payload) => {
        notifications.push({
          title: payload.title,
          body: payload.body,
        });
      },
    });

    const disruptionRows = await db
      .select({
        description: disruptions.description,
        severity: disruptions.severity,
      })
      .from(disruptions)
      .where(eq(disruptions.routeId, routeId));
    expect(disruptionRows).toHaveLength(1);
    expect(disruptionRows[0]?.severity).toBe("info");
    expect(disruptionRows[0]?.description).toContain("Predicted arrival");

    expect(notifications).toContainEqual({
      title: "Possible route delay",
      body: disruptionRows[0]?.description ?? "",
    });
  });

  test("does not duplicate disruption or rerun the same offset twice", async () => {
    const unique = `worker-idempotent-${Date.now()}`;
    const { routeId, userId } = await createWorkerRouteFixture({ db, unique });
    cleanupUserIds.push(userId);

    const notifications: string[] = [];
    const deps = {
      db,
      googleApiKey: googleKey,
      now: dueCheckNow,
      evaluateRouteCheck: async () => ({
        ok: false,
        summary: "Idempotent worker disruption",
      }),
      sendPushNotification: async (payload: { title: string }) => {
        notifications.push(payload.title);
      },
    };

    await runDueRouteChecks(deps);
    await runDueRouteChecks(deps);

    const disruptionRows = await db
      .select({ id: disruptions.id })
      .from(disruptions)
      .where(eq(disruptions.routeId, routeId));
    expect(disruptionRows).toHaveLength(1);

    const runRows = await db
      .select({
        offsetMinutes: routeCheckRuns.offsetMinutes,
        result: routeCheckRuns.result,
      })
      .from(routeCheckRuns)
      .where(eq(routeCheckRuns.routeId, routeId));
    expect(runRows).toEqual([
      {
        offsetMinutes: -5,
        result: "fail",
      },
    ]);
    expect(notifications).toEqual(["Route disruption"]);
  });
});
