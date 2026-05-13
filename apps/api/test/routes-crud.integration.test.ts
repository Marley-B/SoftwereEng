import "dotenv/config";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import type { Database } from "@route-helper/db";
import { users } from "@route-helper/db";
import type { FastifyInstance } from "fastify";

import {
  createIntegrationApp,
  describeIntegration,
  minimalRouteCreateBody,
} from "./helpers.js";

describeIntegration("GET/POST/PATCH/DELETE /routes", () => {
  let app: FastifyInstance;
  let db: Database;
  let userId: string;
  let token: string;

  beforeAll(async () => {
    const created = await createIntegrationApp();
    app = created.app;
    db = created.db;

    const email = `routes-crud-${Date.now()}@example.com`;
    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email,
        password: "securepass123",
        displayName: "Routes CRUD",
      },
    });
    const regBody = JSON.parse(reg.body) as { token: string; user: { id: string } };
    userId = regBody.user.id;
    token = regBody.token;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await app.close();
  });

  test("CRUD flow: empty list, create, get by id, patch name, delete", async () => {
    const list0 = await app.inject({
      method: "GET",
      url: "/routes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(list0.statusCode).toBe(200);
    expect(JSON.parse(list0.body)).toEqual([]);

    const body = minimalRouteCreateBody("Morning commute", `u${Date.now()}`);
    const created = await app.inject({
      method: "POST",
      url: "/routes",
      headers: { authorization: `Bearer ${token}` },
      payload: body,
    });
    expect(created.statusCode).toBe(201);
    const row = JSON.parse(created.body) as { id: string; name: string };
    const routeId = row.id;
    expect(row.name).toBe("Morning commute");

    const one = await app.inject({
      method: "GET",
      url: `/routes/${routeId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(one.statusCode).toBe(200);
    expect((JSON.parse(one.body) as { id: string }).id).toBe(routeId);

    const patched = await app.inject({
      method: "PATCH",
      url: `/routes/${routeId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Updated name" },
    });
    expect(patched.statusCode).toBe(200);
    expect((JSON.parse(patched.body) as { name: string }).name).toBe("Updated name");

    const del = await app.inject({
      method: "DELETE",
      url: `/routes/${routeId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);

    const gone = await app.inject({
      method: "GET",
      url: `/routes/${routeId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(gone.statusCode).toBe(404);
  });
});
