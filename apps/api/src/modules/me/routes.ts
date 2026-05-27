import type { FastifyPluginAsync } from "fastify";
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import { disruptions, pushTokens, routeLocationSamples, routes } from "@route-helper/db";
import {
  detectRecurringRoutes,
  disruptionResponseSchema,
  locationSamplesBodySchema,
  pushTokenBodySchema,
  routeSuggestionSchema,
} from "@route-helper/shared";
import { createRequireAuth } from "../../hooks/requireAuth.js";

function occurredAtToIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }
  return new Date(String(value)).toISOString();
}

const testSuggestedAlternative = routeSuggestionSchema.parse({
  id: "test-alt-1",
  label: "25 min",
  durationSeconds: 25 * 60,
  savingsSeconds: 8 * 60,
  segments: [
    { kind: "transit", modeLabel: "Subway", line: "Line 1" },
    { kind: "walk", modeLabel: "Walk", line: "Walk 4 min" },
  ],
  payload: { source: "test-disruption" },
  summary: "Saves about 8 min with 25 min",
});

export const registerMeRoutes: FastifyPluginAsync = async (app) => {
  const requireAuth = createRequireAuth(app.config.jwtSecret);

  app.post("/location-samples", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const parsed = locationSamplesBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const values = parsed.data.samples
      .map((sample) => ({
        userId,
        lat: sample.lat,
        lng: sample.lng,
        accuracyMeters: sample.accuracyMeters !== undefined ? Math.round(sample.accuracyMeters) : null,
        recordedAt: new Date(sample.recordedAt),
      }))
      .filter((sample) => !Number.isNaN(sample.recordedAt.getTime()));
    if (values.length === 0) {
      return reply.status(400).send({ error: "No valid samples" });
    }
    await app.db.insert(routeLocationSamples).values(values);
    return { inserted: values.length };
  });

  app.get("/route-analysis", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const query = request.query as { days?: string } | undefined;
    const days = Math.min(30, Math.max(1, Number.parseInt(query?.days ?? "14", 10) || 14));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await app.db
      .select()
      .from(routeLocationSamples)
      .where(and(eq(routeLocationSamples.userId, userId), gte(routeLocationSamples.recordedAt, cutoff)))
      .orderBy(asc(routeLocationSamples.recordedAt));
    const samples = rows.map((row) => ({
      ...(row.accuracyMeters !== null ? { accuracyMeters: row.accuracyMeters } : {}),
      lat: row.lat,
      lng: row.lng,
      recordedAt: row.recordedAt.toISOString(),
    }));
    const recentSamples = samples.slice(-5).reverse();
    return {
      days,
      recentSamples,
      sampleCount: samples.length,
      result: detectRecurringRoutes(samples),
    };
  });

  app.get("/disruptions", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const includeDismissed =
      String((request.query as { include_dismissed?: string }).include_dismissed ?? "") === "true";
    const userFilter = eq(disruptions.userId, userId);
    const rows = await app.db
      .select({
        disruption: disruptions,
        routeName: routes.name
      })
      .from(disruptions)
      .leftJoin(routes, eq(disruptions.routeId, routes.id))
      .where(includeDismissed ? userFilter : and(userFilter, isNull(disruptions.dismissedAt)))
      .orderBy(desc(disruptions.occurredAt));

    return rows.map(({ disruption, routeName }) =>
      disruptionResponseSchema.parse({
        id: disruption.id,
        occurredAt: occurredAtToIso(disruption.occurredAt),
        description: disruption.description,
        severity: disruption.severity,
        routeId: disruption.routeId,
        suggestedAlternative: disruption.suggestedAlternative,
        affectedRoutes: routeName ? [routeName] : []
      })
    );
  });

  app.post("/disruptions/:disruptionId/dismiss", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const disruptionId = (request.params as { disruptionId: string }).disruptionId;
    const updated = await app.db
      .update(disruptions)
      .set({ dismissedAt: new Date() })
      .where(and(eq(disruptions.id, disruptionId), eq(disruptions.userId, userId)))
      .returning({ id: disruptions.id });
    if (updated.length === 0) {
      return reply.status(404).send({ error: "Not found" });
    }
    return { ok: true };
  });

  app.post("/push-tokens", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const parsed = pushTokenBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { expoPushToken, deviceId } = parsed.data;
    const now = new Date();
    await app.db
      .insert(pushTokens)
      .values({
        userId,
        expoPushToken,
        deviceId: deviceId ?? null,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [pushTokens.userId, pushTokens.expoPushToken],
        set: {
          updatedAt: now,
          deviceId: deviceId ?? null
        }
      });
    return { ok: true };
  });

  // Test-only: create a fake disruption for the authenticated user.
  // Useful for manual testing of mobile UX without waiting for the worker.
  app.post("/disruptions/test", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const body = request.body as { severity?: string; description?: string; routeId?: string } | undefined;
    const severity = body?.severity === "info" ? "info" : "warn";
    const description = body?.description ?? (severity === "info" ? "Possible delay (test)" : "Route disruption (test)");

    let route: { id: string; name: string } | undefined;
    if (body?.routeId) {
      const [found] = await app.db
        .select({ id: routes.id, name: routes.name })
        .from(routes)
        .where(and(eq(routes.userId, userId), eq(routes.id, body.routeId)))
        .limit(1);
      route = found;
    } else {
      const [found] = await app.db
        .select({ id: routes.id, name: routes.name })
        .from(routes)
        .where(eq(routes.userId, userId))
        .orderBy(desc(routes.createdAt))
        .limit(1);
      route = found;
    }

    if (!route) {
      return reply.status(404).send({ error: "No route found for this user" });
    }

    const [row] = await app.db
      .insert(disruptions)
      .values({ userId, routeId: route.id, description, severity, suggestedAlternative: testSuggestedAlternative })
      .returning();

    if (!row) {
      return reply.status(500).send({ error: "Failed to create test disruption" });
    }

    return disruptionResponseSchema.parse({
      id: row.id,
      occurredAt: occurredAtToIso(row.occurredAt),
      description: row.description,
      severity: row.severity,
      routeId: row.routeId,
      suggestedAlternative: row.suggestedAlternative,
      affectedRoutes: [route.name],
    });
  });
};
