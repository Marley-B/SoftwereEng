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
