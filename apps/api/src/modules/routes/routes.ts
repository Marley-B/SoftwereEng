import { FastifyPluginAsync } from "fastify";

export const registerCommuteRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({ message: "Not implemented" }));
  app.post("/", async () => ({ message: "Not implemented" }));
  app.get("/:routeId", async () => ({ message: "Not implemented" }));
  app.patch("/:routeId", async () => ({ message: "Not implemented" }));
  app.delete("/:routeId", async () => ({ message: "Not implemented" }));
};
