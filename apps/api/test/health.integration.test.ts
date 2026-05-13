import "dotenv/config";
import { afterAll, beforeAll, expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";

import { createIntegrationApp, describeIntegration } from "./helpers.js";

describeIntegration("GET /health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const created = await createIntegrationApp();
    app = created.app;
  });

  afterAll(async () => {
    await app.close();
  });

  test("returns ok without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
});
