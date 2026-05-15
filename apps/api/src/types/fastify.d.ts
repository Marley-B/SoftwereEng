import type { Database } from "@route-helper/db";

import type { GoogleApiQuota } from "../lib/googleApiQuota.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    googleApiQuota: GoogleApiQuota;
    config: {
      jwtSecret: string;
      googleRoutesApiKey: string;
    };
  }

  interface FastifyRequest {
    auth?: {
      userId: string;
      email: string;
    };
  }
}
