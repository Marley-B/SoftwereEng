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
  let userId = "";
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
    userId = body.user.id;
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
    const limit = tightGoogleApiQuotaConfig.maxPerPlacesSession;

    for (let i = 0; i < limit; i += 1) {
      const result = app.googleApiQuota.consumePlaces(userId, sessionToken);
      expect(result.ok).toBe(true);
    }

    const res = await app.inject({
      method: "GET",
      url: `/places/autocomplete?input=ams&sessionToken=${sessionToken}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body) as { code?: string; error?: string };
    expect(body.code).toBe("GOOGLE_API_QUOTA_EXCEEDED");
    expect(body.error).toContain("search session");
  });
});
