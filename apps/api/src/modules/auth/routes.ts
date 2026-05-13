import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { users } from "@route-helper/db";
import {
  authResponseSchema,
  loginBodySchema,
  registerBodySchema
} from "@route-helper/shared";
import { hashPassword, verifyPassword } from "../../lib/scryptPassword.js";
import { signAccessToken } from "../../lib/jwtTokens.js";

export const registerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const parsed = registerBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { email, password, displayName } = parsed.data;
    const passwordHash = hashPassword(password);
    try {
      const [row] = await app.db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          displayName
        })
        .returning({ id: users.id, email: users.email, displayName: users.displayName });
      if (!row) {
        return reply.status(500).send({ error: "Failed to create user" });
      }
      const token = signAccessToken(app.config.jwtSecret, {
        sub: row.id,
        email: row.email
      });
      const body = authResponseSchema.parse({
        token,
        user: { id: row.id, email: row.email, displayName: row.displayName }
      });
      return reply.status(201).send(body);
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "";
      if (code === "23505") {
        return reply.status(409).send({ error: "Email already registered" });
      }
      app.log.error(err);
      return reply.status(500).send({ error: "Registration failed" });
    }
  });

  app.post("/login", async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const [row] = await app.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        passwordHash: users.passwordHash
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (!row || !verifyPassword(password, row.passwordHash)) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }
    const token = signAccessToken(app.config.jwtSecret, {
      sub: row.id,
      email: row.email
    });
    const body = authResponseSchema.parse({
      token,
      user: { id: row.id, email: row.email, displayName: row.displayName }
    });
    return reply.send(body);
  });
};
