import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { computeTransitRouteOptions } from "@route-helper/google-routes";
import { routes } from "@route-helper/db";
import {
  placeRefSchema,
  transitOptionsBodySchema,
  transitOptionsResponseSchema,
  transitSnapshotSchema,
  routeCreateBodySchema,
  routeResponseSchema,
  routeUpdateBodySchema
} from "@route-helper/shared";
import { createRequireAuth } from "../../hooks/requireAuth.js";
import { sendGoogleQuotaExceeded } from "../../lib/sendGoogleQuotaExceeded.js";

type RouteRow = typeof routes.$inferSelect;

const toRouteResponse = (r: RouteRow) =>
  routeResponseSchema.parse({
    id: r.id,
    name: r.name,
    startTime: r.startTime,
    expectedArrival: r.expectedArrival,
    timeZone: r.timezone,
    departure: r.departureLabel,
    destination: r.destinationLabel,
    origin: placeRefSchema.parse(r.origin),
    destinationPlace: placeRefSchema.parse(r.destination),
    transitSnapshot: transitSnapshotSchema.parse(r.transitSnapshot)
  });

export const registerCommuteRoutes: FastifyPluginAsync = async (app) => {
  const requireAuth = createRequireAuth(app.config.jwtSecret);

  app.post(
    "/transit-options",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = request.auth?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      const parsed = transitOptionsBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const { origin, destination, departureIso } = parsed.data;
      const departure = new Date(departureIso);
      if (Number.isNaN(departure.getTime())) {
        return reply.status(400).send({ error: "Invalid departureIso" });
      }
      const quota = app.googleApiQuota.consumeTransit(userId);
      if (!quota.ok) {
        sendGoogleQuotaExceeded(reply, quota);
        return;
      }
      const options = await computeTransitRouteOptions({
        apiKey: app.config.googleRoutesApiKey,
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        departureTimeRfc3339: departure.toISOString(),
        computeAlternativeRoutes: true
      });
      const mapped = options.map((o) => ({
        id: o.id,
        label: o.label,
        durationSeconds: o.durationSeconds,
        ...(o.staticDurationSeconds !== undefined ? { staticDurationSeconds: o.staticDurationSeconds } : {}),
        ...(o.segments !== undefined && o.segments.length > 0 ? { segments: o.segments } : {}),
        payload: o.payload
      }));
      return transitOptionsResponseSchema.parse({ options: mapped });
    }
  );

  app.get("/", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const rows = await app.db
      .select()
      .from(routes)
      .where(eq(routes.userId, userId))
      .orderBy(desc(routes.createdAt));
    return rows.map((r) => toRouteResponse(r));
  });

  app.post("/", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const parsed = routeCreateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const body = parsed.data;
    const snapshot = transitSnapshotSchema.parse(body.transitSnapshot);
    const [row] = await app.db
      .insert(routes)
      .values({
        userId,
        name: body.name,
        startTime: body.startTime,
        expectedArrival: body.expectedArrival,
        timezone: body.timeZone,
        departureLabel: body.departureLabel,
        destinationLabel: body.destinationLabel,
        origin: body.origin,
        destination: body.destination,
        transitSnapshot: snapshot,
        updatedAt: new Date()
      })
      .returning();
    if (!row) {
      return reply.status(500).send({ error: "Failed to create route" });
    }
    return reply.status(201).send(toRouteResponse(row));
  });

  app.get("/:routeId", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const routeId = (request.params as { routeId: string }).routeId;
    const [row] = await app.db
      .select()
      .from(routes)
      .where(and(eq(routes.id, routeId), eq(routes.userId, userId)))
      .limit(1);
    if (!row) {
      return reply.status(404).send({ error: "Not found" });
    }
    return toRouteResponse(row);
  });

  app.patch("/:routeId", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const routeId = (request.params as { routeId: string }).routeId;
    const parsed = routeUpdateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const patch = parsed.data;
    const [existing] = await app.db
      .select()
      .from(routes)
      .where(and(eq(routes.id, routeId), eq(routes.userId, userId)))
      .limit(1);
    if (!existing) {
      return reply.status(404).send({ error: "Not found" });
    }
    const nextSnapshot =
      patch.transitSnapshot !== undefined
        ? transitSnapshotSchema.parse(patch.transitSnapshot)
        : transitSnapshotSchema.parse(existing.transitSnapshot);
    const [row] = await app.db
      .update(routes)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
        ...(patch.expectedArrival !== undefined ? { expectedArrival: patch.expectedArrival } : {}),
        ...(patch.timeZone !== undefined ? { timezone: patch.timeZone } : {}),
        ...(patch.departureLabel !== undefined ? { departureLabel: patch.departureLabel } : {}),
        ...(patch.destinationLabel !== undefined ? { destinationLabel: patch.destinationLabel } : {}),
        ...(patch.origin !== undefined ? { origin: patch.origin } : {}),
        ...(patch.destination !== undefined ? { destination: patch.destination } : {}),
        transitSnapshot: nextSnapshot,
        updatedAt: new Date()
      })
      .where(and(eq(routes.id, routeId), eq(routes.userId, userId)))
      .returning();
    if (!row) {
      return reply.status(404).send({ error: "Not found" });
    }
    return toRouteResponse(row);
  });

  app.delete("/:routeId", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.auth?.userId;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const routeId = (request.params as { routeId: string }).routeId;
    const deleted = await app.db
      .delete(routes)
      .where(and(eq(routes.id, routeId), eq(routes.userId, userId)))
      .returning({ id: routes.id });
    if (deleted.length === 0) {
      return reply.status(404).send({ error: "Not found" });
    }
    return reply.status(204).send();
  });
};
