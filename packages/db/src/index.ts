import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export * from "./schema.js";
export { runMigrations } from "./migrate.js";

export type Database = ReturnType<typeof createDb>;

/** Drizzle client bound to the shared schema (API + worker). */
export const createDb = (connectionString: string) => {
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
};
