import "dotenv/config";
import { createDb, runMigrations } from "@route-helper/db";
import { startScheduler } from "./scheduler/startScheduler.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
const googleApiKey = process.env.GOOGLE_ROUTES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "";
if (!googleApiKey) {
  throw new Error("GOOGLE_ROUTES_API_KEY or GOOGLE_MAPS_API_KEY is required");
}

await runMigrations(databaseUrl);
const db = createDb(databaseUrl);
const scheduler = startScheduler({ db, googleApiKey });

const shutdown = async (signal: NodeJS.Signals): Promise<never> => {
  console.log(`[worker] received ${signal}, stopping scheduler`);
  scheduler.stop();
  process.exit(0);
};

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await new Promise<void>(() => {
  /* keep the worker alive until interrupted */
});
