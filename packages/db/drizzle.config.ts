import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import { resolve } from "path";

// This tells the script to look for the .env file inside packages/db
dotenv.config({ path: resolve(__dirname, ".env") });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, 
  }
});