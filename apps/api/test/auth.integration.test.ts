import "dotenv/config";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "@route-helper/db";
import { users } from "@route-helper/db";
import type { FastifyInstance } from "fastify";

import { createIntegrationApp, describeIntegration } from "./helpers.js";

describeIntegration("POST /auth/register and /auth/login", () => {
  let app: FastifyInstance;
  let db: Database;
  const cleanupIds: string[] = [];

  beforeAll(async () => {
    const created = await createIntegrationApp();
    app = created.app;
    db = created.db;
  });

  afterAll(async () => {
    for (const id of cleanupIds) {
      await db.delete(users).where(eq(users.id, id));
    }
    await app.close();
  });

  test("register returns 201 and JWT; login with same credentials succeeds", async () => {
    const email = `auth-int-${Date.now()}@example.com`;
    const password = "securepass123";
    const displayName = "Auth Int";

    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password, displayName },
    });
    expect(reg.statusCode).toBe(201);
    const regBody = JSON.parse(reg.body) as { token: string; user: { id: string; email: string } };
    expect(regBody.token.length).toBeGreaterThan(10);
    expect(regBody.user.email).toBe(email.toLowerCase());
    cleanupIds.push(regBody.user.id);

    const bad = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "wrong-password" },
    });
    expect(bad.statusCode).toBe(401);

    const ok = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    expect(ok.statusCode).toBe(200);
    const okBody = JSON.parse(ok.body) as { token: string; user: { id: string } };
    expect(okBody.user.id).toBe(regBody.user.id);

    const dup = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "otherpass12", displayName: "X" },
    });
    expect(dup.statusCode).toBe(409);
  });
});
