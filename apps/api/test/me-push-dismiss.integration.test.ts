import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "@route-helper/db";
import { disruptions, pushTokens, users } from "@route-helper/db";
import type { FastifyInstance } from "fastify";

import { createIntegrationApp, describeIntegration, jwtSecret } from "./helpers.js";
import { signAccessToken } from "../src/lib/jwtTokens.js";
import { hashPassword } from "../src/lib/scryptPassword.js";

describeIntegration("POST /me/push-tokens and /me/disruptions/:id/dismiss", () => {
  let app: FastifyInstance;
  let db: Database;
  let userId: string;
  let disruptionId: string;

  beforeAll(async () => {
    const created = await createIntegrationApp();
    app = created.app;
    db = created.db;

    const email = `me-push-${Date.now()}@example.com`;
    const [u] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashPassword("pw12345678"),
        displayName: "Me routes test",
      })
      .returning({ id: users.id });
    if (!u) {
      throw new Error("insert user");
    }
    userId = u.id;

    const [d] = await db
      .insert(disruptions)
      .values({
        userId,
        routeId: null,
        description: "Dismiss integration",
        severity: "warn",
      })
      .returning({ id: disruptions.id });
    if (!d) {
      throw new Error("insert disruption");
    }
    disruptionId = d.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await app.close();
  });

  test("push-tokens upserts; dismiss marks disruption hidden from default list", async () => {
    const token = signAccessToken(jwtSecret, { sub: userId, email: "x@example.com" });

    const push = await app.inject({
      method: "POST",
      url: "/me/push-tokens",
      headers: { authorization: `Bearer ${token}` },
      payload: { expoPushToken: `ExponentPushToken[test-${Date.now()}]`, deviceId: "dev-1" },
    });
    expect(push.statusCode).toBe(200);

    const push2 = await app.inject({
      method: "POST",
      url: "/me/push-tokens",
      headers: { authorization: `Bearer ${token}` },
      payload: { expoPushToken: `ExponentPushToken[test-${Date.now()}]`, deviceId: "dev-2" },
    });
    expect(push2.statusCode).toBe(200);

    const listBefore = await app.inject({
      method: "GET",
      url: "/me/disruptions",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listBefore.statusCode).toBe(200);
    const active = JSON.parse(listBefore.body) as { id: string }[];
    expect(active.some((x) => x.id === disruptionId)).toBe(true);

    const dismiss = await app.inject({
      method: "POST",
      url: `/me/disruptions/${disruptionId}/dismiss`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dismiss.statusCode).toBe(200);

    const listAfter = await app.inject({
      method: "GET",
      url: "/me/disruptions",
      headers: { authorization: `Bearer ${token}` },
    });
    const active2 = JSON.parse(listAfter.body) as { id: string }[];
    expect(active2.some((x) => x.id === disruptionId)).toBe(false);

    const withDismissed = await app.inject({
      method: "GET",
      url: "/me/disruptions?include_dismissed=true",
      headers: { authorization: `Bearer ${token}` },
    });
    const all = JSON.parse(withDismissed.body) as { id: string }[];
    expect(all.some((x) => x.id === disruptionId)).toBe(true);

    const [tokRow] = await db
      .select({ id: pushTokens.id })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId))
      .limit(1);
    expect(tokRow).toBeDefined();
  });
});
