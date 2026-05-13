import cron from "node-cron";
import type { Database } from "@route-helper/db";
import { runDueRouteChecks } from "../jobs/runDueRouteChecks.js";

export interface SchedulerOptions {
  db: Database;
  googleApiKey: string;
}

/** Every minute: pre-departure checks at T-60 / T-30 / T-5. */
export const startScheduler = (opts: SchedulerOptions): void => {
  cron.schedule(
    "* * * * *",
    () => {
      void runDueRouteChecks({ db: opts.db, googleApiKey: opts.googleApiKey }).catch((err) => {
        console.error("[worker] runDueRouteChecks failed", err);
      });
    },
    { timezone: "UTC" },
  );
  console.log("[worker] scheduler started (every minute UTC)");
};
