import { FastifyPluginAsync } from "fastify";

export const registerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post("/email/start", async () => ({ message: "Not implemented" }));
  app.post("/email/verify", async () => ({ message: "Not implemented" }));
  app.post("/oauth/google", async () => ({ message: "Not implemented" }));
  app.post("/oauth/apple", async () => ({ message: "Not implemented" }));
};
