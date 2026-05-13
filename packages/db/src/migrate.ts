import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as schema from "./schema.js";

const migrationsFolder = path.join(fileURLToPath(new URL(".", import.meta.url)), "../drizzle");

/** Apply SQL migrations in `packages/db/drizzle` (call once at API startup). */
export const runMigrations = async (connectionString: string): Promise<void> => {
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient, { schema });
  await migrate(db, { migrationsFolder });
  await migrationClient.end();
};
