import "dotenv/config";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "@route-helper/db";
import { users } from "@route-helper/db";
import type { FastifyInstance } from "fastify";

import {
  createIntegrationApp,
  describeIntegration,
  tightGoogleApiQuotaConfig,
} from "./helpers.js";

describeIntegration("Google API quota", () => {
  let app: FastifyInstance;
  let db: Database;
  let token = "";
  const cleanupIds: string[] = [];

  beforeAll(async () => {
    const created = await createIntegrationApp({
      googleApiQuotaConfig: tightGoogleApiQuotaConfig,
    });
    app = created.app;
    db = created.db;

    const email = `quota-int-${Date.now()}@example.com`;
    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "securepass123", displayName: "Quota" },
    });
    expect(reg.statusCode).toBe(201);
    const body = JSON.parse(reg.body) as { token: string; user: { id: string } };
    token = body.token;
    cleanupIds.push(body.user.id);
  });

  afterAll(async () => {
    for (const id of cleanupIds) {
      await db.delete(users).where(eq(users.id, id));
    }
    await app.close();
  });

  test("returns 429 when places session quota is exceeded", async () => {
    const sessionToken = "quota-test-session-token-01";
    const headers = { authorization: `Bearer ${token}` };

    const first = await app.inject({
      method: "GET",
      url: `/places/autocomplete?input=ams&sessionToken=${sessionToken}`,
      headers,
    });
    expect(first.statusCode).not.toBe(429);

    const second = await app.inject({
      method: "GET",
      url: `/places/autocomplete?input=amst&sessionToken=${sessionToken}`,
      headers,
    });
    expect(second.statusCode).not.toBe(429);

    const third = await app.inject({
      method: "GET",
      url: `/places/autocomplete?input=amste&sessionToken=${sessionToken}`,
      headers,
    });
    expect(third.statusCode).toBe(429);
    const body = JSON.parse(third.body) as { code?: string; error?: string };
    expect(body.code).toBe("GOOGLE_API_QUOTA_EXCEEDED");
    expect(body.error).toContain("search session");
  });
});
