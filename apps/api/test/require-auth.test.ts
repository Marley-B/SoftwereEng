import { afterAll, beforeAll, expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";

import { createIntegrationApp, describeIntegration } from "./helpers.js";

describeIntegration("requireAuth preHandler", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const created = await createIntegrationApp();
    app = created.app;
  });

  afterAll(async () => {
    await app.close();
  });

  test("GET /routes returns 401 without Authorization header", async () => {
    const res = await app.inject({ method: "GET", url: "/routes" });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: "Unauthorized" });
  });

  test("GET /routes returns 401 for invalid bearer token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/routes",
      headers: { authorization: "Bearer not-a-jwt" },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: "Unauthorized" });
  });
});
