import cron from "node-cron";

export const startScheduler = (): void => {
  // Placeholder worker heartbeat. Replace with due-check execution flow later.
  cron.schedule("*/5 * * * *", () => {
    // Intentionally minimal side effect while bootstrapping project structure.
    console.log("[worker] scheduler heartbeat");
  });
};
