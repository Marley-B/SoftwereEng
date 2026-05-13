/**
 * Verifies persisted disruptions (same shape as worker inserts) are returned from GET /me/disruptions.
 */
import "dotenv/config";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "@route-helper/db";
import { disruptions, users } from "@route-helper/db";
import type { FastifyInstance } from "fastify";

import { createIntegrationApp, describeIntegration, jwtSecret } from "./helpers.js";
import { signAccessToken } from "../src/lib/jwtTokens.js";
import { hashPassword } from "../src/lib/scryptPassword.js";

describeIntegration("GET /me/disruptions (integration)", () => {
  let app: FastifyInstance;
  let db: Database;
  let userId: string;
  let disruptionId: string;
  const marker = `integration-disruption-${Date.now()}`;

  beforeAll(async () => {
    const created = await createIntegrationApp();
    app = created.app;
    db = created.db;

    const email = `disruption-test-${Date.now()}@example.com`;
    const [u] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashPassword("test-password-12345"),
        displayName: "Disruption test user",
      })
      .returning({ id: users.id });
    if (!u) {
      throw new Error("Failed to insert test user");
    }
    userId = u.id;

    const [d] = await db
      .insert(disruptions)
      .values({
        userId,
        routeId: null,
        description: `Route “Test line”: ${marker}`,
        severity: "warn",
      })
      .returning({ id: disruptions.id });
    if (!d) {
      throw new Error("Failed to insert test disruption");
    }
    disruptionId = d.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await app.close();
  });

  test("returns worker-style disruption for authenticated user", async () => {
    const token = signAccessToken(jwtSecret, {
      sub: userId,
      email: "disruption-test@example.com",
    });

    const res = await app.inject({
      method: "GET",
      url: "/me/disruptions",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Array<{
      id: string;
      description: string;
      occurredAt: string;
      affectedRoutes: string[];
    }>;
    expect(Array.isArray(body)).toBe(true);
    const found = body.find((row) => row.id === disruptionId);
    expect(found).toBeDefined();
    expect(found?.description).toContain(marker);
    expect(typeof found?.occurredAt).toBe("string");
    expect(Array.isArray(found?.affectedRoutes)).toBe(true);
  });
});
