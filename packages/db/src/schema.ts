import {
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

/** User accounts with authentication. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
  ]
);
