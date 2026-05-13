import { DateTime } from "luxon";

function parseHHmm(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) {
    return null;
  }
  const hour = Number.parseInt(m[1] ?? "", 10);
  const minute = Number.parseInt(m[2] ?? "", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

/**
 * Returns true if predicted arrival (departure + duration) is on or before
 * the user's expected wall-clock arrival the same local day (plus slack).
 */
export const isPredictedArrivalWithinSlack = (args: {
  departureUtc: Date;
  durationSeconds: number;
  expectedArrivalHHmm: string;
  timeZone: string;
  slackMinutes: number;
}): { ok: boolean; reason?: string } => {
  const parts = parseHHmm(args.expectedArrivalHHmm);
  if (!parts) {
    return { ok: false, reason: "Invalid expected arrival time" };
  }
  const dep = DateTime.fromJSDate(args.departureUtc, { zone: "utc" }).setZone(args.timeZone);
  const expectedLocal = dep.set({
    hour: parts.hour,
    minute: parts.minute,
    second: 0,
    millisecond: 0
  });
  const predicted = dep.plus({ seconds: args.durationSeconds });
  const limit = expectedLocal.plus({ minutes: args.slackMinutes });
  if (predicted > limit) {
    return {
      ok: false,
      reason: `Predicted arrival ${predicted.toFormat("HH:mm")} is after expected ${expectedLocal.toFormat("HH:mm")} (+${args.slackMinutes}m slack)`
    };
  }
  return { ok: true };
};

/** Next departure instant for recurring daily route: today's wall clock in `timeZone`. */
export const departureInstantForLocalWallClock = (args: {
  startTimeHHmm: string;
  timeZone: string;
  /** Anchor "now" for which calendar day to use (usually new Date()). */
  now?: Date;
}): Date | null => {
  const parts = parseHHmm(args.startTimeHHmm);
  if (!parts) {
    return null;
  }
  const now = args.now ?? new Date();
  const local = DateTime.fromJSDate(now, { zone: "utc" }).setZone(args.timeZone);
  const candidate = local.set({
    hour: parts.hour,
    minute: parts.minute,
    second: 0,
    millisecond: 0
  });
  return candidate.toUTC().toJSDate();
};

export const localDateStringInZone = (utc: Date, timeZone: string): string =>
  DateTime.fromJSDate(utc, { zone: "utc" }).setZone(timeZone).toISODate() ?? "";
