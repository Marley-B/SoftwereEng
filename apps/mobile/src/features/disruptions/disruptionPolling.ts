import type { Route } from "../routes/types";

/**
 * Calculates the minute of day for a given HH:mm time.
 * @param timeHHmm Time like "8:00" or "14:30"
 * @returns Minute of day (0-1439), or null if invalid
 */
export function getMinuteOfDay(timeHHmm: string | undefined): number | null {
  if (!timeHHmm) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeHHmm.trim());
  if (!match?.[1] || !match?.[2]) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Gets today's day name (e.g., "monday", "tuesday").
 */
export function getTodayDayName(): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()] ?? "monday";
}

/**
 * Checks if a route is "due soon" — runs today and departs within the next 60 minutes.
 */
export function isRouteDueSoon(route: Route): boolean {
  const today = getTodayDayName();
  if (!route.daysOfWeek || !route.daysOfWeek.includes(today)) {
    return false;
  }

  const startMin = getMinuteOfDay(route.startTime);
  if (startMin === null) return false;

  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  // Route is due if it starts within 60 minutes from now
  return startMin >= currentMin && startMin <= currentMin + 60;
}
