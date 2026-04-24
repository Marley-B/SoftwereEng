import { FastifyPluginAsync } from "fastify";

export const registerPushTokenRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async () => ({ message: "Not implemented" }));
};
