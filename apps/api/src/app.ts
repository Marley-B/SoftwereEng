import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { registerAuthRoutes } from "./modules/auth/routes";
import { registerCommuteRoutes } from "./modules/routes/routes";
import { registerPushTokenRoutes } from "./modules/push/routes";

export const buildApp = (): FastifyInstance => {
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: true });
  void app.register(sensible);

  app.get("/health", async () => ({ ok: true }));

  void app.register(registerAuthRoutes, { prefix: "/auth" });
  void app.register(registerCommuteRoutes, { prefix: "/routes" });
  void app.register(registerPushTokenRoutes, { prefix: "/me/push-tokens" });

  return app;
};
