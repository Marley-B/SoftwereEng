import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

/** Registered commuter accounts. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

/** Saved commute with Google transit snapshot for worker replay. */
export const routes = pgTable(
  "routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startTime: text("start_time").notNull(),
    expectedArrival: text("expected_arrival").notNull(),
    timezone: text("timezone").notNull(),
    departureLabel: text("departure_label").notNull(),
    destinationLabel: text("destination_label").notNull(),
    origin: jsonb("origin").notNull(),
    destination: jsonb("destination").notNull(),
    transitSnapshot: jsonb("transit_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index("routes_user_id_idx").on(t.userId)]
);

/** Expo push tokens per user (upsert). */
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull(),
    deviceId: text("device_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("push_tokens_user_token_uidx").on(t.userId, t.expoPushToken)
  ]
);

/** Disruption surfaced when a pre-trip check fails. */
export const disruptions = pgTable(
  "disruptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    routeId: uuid("route_id").references(() => routes.id, { onDelete: "set null" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    description: text("description").notNull(),
    severity: text("severity").notNull().default("warn"),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true })
  },
  (t) => [index("disruptions_user_occurred_idx").on(t.userId, t.occurredAt)]
);

/**
 * Idempotency for T-60 / T-30 / T-5 checks per route per local calendar day.
 * offsetMinutes: negative minutes before departure (e.g. -60, -30, -5).
 */
export const routeCheckRuns = pgTable(
  "route_check_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    offsetMinutes: integer("offset_minutes").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    result: text("result").notNull()
  },
  (t) => [
    uniqueIndex("route_check_runs_route_date_offset_uidx").on(
      t.routeId,
      t.localDate,
      t.offsetMinutes
    )
  ]
);
