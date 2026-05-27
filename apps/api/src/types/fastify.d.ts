import type { Database } from "@route-helper/db";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    config: {
      jwtSecret: string;
    };
  }

  interface FastifyRequest {
    auth?: {
      userId: string;
      email: string;
    };
  }
}
