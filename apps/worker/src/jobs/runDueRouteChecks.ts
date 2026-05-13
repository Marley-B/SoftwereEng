import { and, eq } from "drizzle-orm";
import type { Database } from "@route-helper/db";
import { disruptions, pushTokens, routeCheckRuns, routes } from "@route-helper/db";
import { evaluateTransitRouteCheck } from "@route-helper/google-routes";
import {
  departureInstantForLocalWallClock,
  isPredictedArrivalWithinSlack,
  localDateStringInZone,
  placeRefSchema,
  transitSnapshotSchema,
} from "@route-helper/shared";
import { sendExpoPushNotification } from "../notifications/expoPushClient.js";

const OFFSETS_MIN = [-60, -30, -5] as const;
const TRIGGER_WINDOW_MS = 5 * 60 * 1000;

export interface RunDueChecksDeps {
  db: Database;
  googleApiKey: string;
}

export const runDueRouteChecks = async (deps: RunDueChecksDeps): Promise<void> => {
  const { db, googleApiKey } = deps;
  const now = new Date();

  const rows = await db.select().from(routes);
  for (const route of rows) {
    const dep = departureInstantForLocalWallClock({
      startTimeHHmm: route.startTime,
      timeZone: route.timezone,
      now,
    });
    if (!dep) {
      continue;
    }
    const depMs = dep.getTime();
    const nowMs = now.getTime();
    if (depMs - nowMs > 3 * 60 * 60 * 1000) {
      continue;
    }
    if (nowMs - depMs > 45 * 60 * 1000) {
      continue;
    }

    const localDate = localDateStringInZone(dep, route.timezone);

    for (const offset of OFFSETS_MIN) {
      const triggerAt = new Date(depMs + offset * 60 * 1000);
      if (nowMs < triggerAt.getTime() || nowMs > triggerAt.getTime() + TRIGGER_WINDOW_MS) {
        continue;
      }

      const [already] = await db
        .select({ id: routeCheckRuns.id })
        .from(routeCheckRuns)
        .where(
          and(
            eq(routeCheckRuns.routeId, route.id),
            eq(routeCheckRuns.localDate, localDate),
            eq(routeCheckRuns.offsetMinutes, offset),
          ),
        )
        .limit(1);
      if (already) {
        continue;
      }

      const origin = placeRefSchema.parse(route.origin);
      const destination = placeRefSchema.parse(route.destination);
      const snapshot = transitSnapshotSchema.parse(route.transitSnapshot);

      let ok = true;
      let summary = "ok";
      try {
        const check = await evaluateTransitRouteCheck({
          apiKey: googleApiKey,
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          departureTimeRfc3339: dep.toISOString(),
          baselineDurationSeconds: snapshot.baselineDurationSeconds,
          ...(snapshot.baselineStaticDurationSeconds !== undefined
            ? { baselineStaticDurationSeconds: snapshot.baselineStaticDurationSeconds }
            : {}),
        });
        ok = check.ok;
        summary = check.summary;
        if (ok) {
          const durationSeconds = check.durationSeconds ?? snapshot.baselineDurationSeconds;
          const arrival = isPredictedArrivalWithinSlack({
            departureUtc: dep,
            durationSeconds,
            expectedArrivalHHmm: route.expectedArrival,
            timeZone: route.timezone,
            slackMinutes: 5,
          });
          ok = arrival.ok;
          if (!arrival.ok) {
            summary = arrival.reason ?? "Arrival no longer within expected window";
          }
        }
      } catch (e) {
        ok = false;
        summary = e instanceof Error ? e.message : "Check failed";
      }

      await db.insert(routeCheckRuns).values({
        routeId: route.id,
        localDate,
        offsetMinutes: offset,
        result: ok ? "ok" : "fail",
      });

      if (ok) {
        continue;
      }

      const description = `Route “${route.name}”: ${summary}`;
      await db.insert(disruptions).values({
        userId: route.userId,
        routeId: route.id,
        description,
        severity: "warn",
      });

      const tokens = await db
        .select({ token: pushTokens.expoPushToken })
        .from(pushTokens)
        .where(eq(pushTokens.userId, route.userId));

      for (const { token } of tokens) {
        try {
          await sendExpoPushNotification({
            to: token,
            title: "Route disruption",
            body: description,
            data: { routeId: route.id },
          });
        } catch {
          /* ignore single token failures */
        }
      }
    }
  }
};
