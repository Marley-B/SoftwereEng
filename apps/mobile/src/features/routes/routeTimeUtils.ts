/** Display format aligned with existing mock routes (e.g. "9:00", "14:30"). */
export function formatRouteTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/** Parses "H:mm" or "HH:mm"; falls back to a sensible default when invalid. */
export function parseRouteTime(value: string, fallback: Date): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const next = new Date(fallback);
  const hRaw = match?.[1];
  const mRaw = match?.[2];
  if (hRaw === undefined || mRaw === undefined) {
    return next;
  }
  const hours = Number.parseInt(hRaw, 10);
  const minutes = Number.parseInt(mRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return next;
  }
  next.setHours(hours, minutes, 0, 0);
  return next;
}

/**
 * Seconds between two wall-clock times (`H:mm` from {@link formatRouteTime}).
 * If the arrival time is earlier on the clock than the start time, arrival is treated as the next day
 * (overnight). Returns `null` when both resolve to the same instant.
 */
export function scheduledCommuteWindowSeconds(startHHmm: string, endHHmm: string): number | null {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const start = parseRouteTime(startHHmm, base);
  const end = parseRouteTime(endHHmm, base);
  let diffMs = end.getTime() - start.getTime();
  if (diffMs === 0) {
    return null;
  }
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }
  return Math.floor(diffMs / 1000);
}
