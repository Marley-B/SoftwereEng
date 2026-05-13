import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import { disruptions, pushTokens, routes } from "@route-helper/db";
import { disruptionResponseSchema, pushTokenBodySchema } from "@route-helper/shared";
import { createRequireAuth } from "../../hooks/requireAuth.js";

export const registerMeRoutes: FastifyPluginAsync = async (app) => {
  const requireAuth = createRequireAuth(app.config.jwtSecret);

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
        occurredAt: disruption.occurredAt.toISOString(),
        description: disruption.description,
        severity: disruption.severity,
        routeId: disruption.routeId,
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
};
