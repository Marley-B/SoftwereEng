import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../lib/jwtTokens.js";

export const createRequireAuth =
  (jwtSecret: string) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const header = request.headers.authorization;
    if (header === undefined || !header.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const token = header.slice("Bearer ".length).trim();
    try {
      const payload = verifyAccessToken(jwtSecret, token);
      request.auth = { userId: payload.sub, email: payload.email };
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  };
