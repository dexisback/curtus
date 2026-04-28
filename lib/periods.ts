export const STUDY_DAY_RESET_HOUR_UTC = 5;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Returns the start of the "study day" that contains `date`.
 * A study day resets at 05:00 UTC rather than midnight.
 */
// TODO: make reset hour user-configurable in settings.
export function getStudyDayStart(date: Date): Date {
  const shifted = new Date(date.getTime() - STUDY_DAY_RESET_HOUR_UTC * 60 * 60 * 1_000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      STUDY_DAY_RESET_HOUR_UTC,
      0,
      0,
      0,
    ),
  );
}

/** Monday of the study week that contains `date`. */
export function getWeekStart(date: Date): Date {
  const dayStart = getStudyDayStart(date);
  const dow = dayStart.getUTCDay(); // 0 = Sun
  const diff = dow === 0 ? 6 : dow - 1; // days since Monday
  return new Date(dayStart.getTime() - diff * 86_400_000);
}

/** First study-day of the calendar month that contains `date`. */
export function getMonthStart(date: Date): Date {
  const dayStart = getStudyDayStart(date);
  return new Date(
    Date.UTC(
      dayStart.getUTCFullYear(),
      dayStart.getUTCMonth(),
      1,
      STUDY_DAY_RESET_HOUR_UTC,
      0,
      0,
      0,
    ),
  );
}

/** Redis bucket-key for a daily leaderboard: e.g. "2026-04-20". */
export function getDailyKey(date: Date): string {
  const d = getStudyDayStart(date);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Redis bucket-key for a weekly leaderboard: e.g. "2026-W17". */
export function getWeeklyKey(date: Date): string {
  const w = getWeekStart(date);
  // ISO week number relative to Jan 4 (always in W01)
  const jan4 = new Date(Date.UTC(w.getUTCFullYear(), 0, 4, STUDY_DAY_RESET_HOUR_UTC));
  const weekNum = Math.ceil(((w.getTime() - jan4.getTime()) / 86_400_000 + 4) / 7);
  return `${w.getUTCFullYear()}-W${pad(weekNum)}`;
}

/** Redis bucket-key for a monthly leaderboard: e.g. "2026-04". */
export function getMonthlyKey(date: Date): string {
  const m = getMonthStart(date);
  return `${m.getUTCFullYear()}-${pad(m.getUTCMonth() + 1)}`;
}

export type Period = "daily" | "weekly" | "monthly";

/** Inclusive start and exclusive end for a leaderboard period. */
export function getPeriodWindow(
  period: Period,
  now: Date,
): { start: Date; end: Date } {
  if (period === "daily") {
    const start = getStudyDayStart(now);
    return { start, end: new Date(start.getTime() + 86_400_000) };
  }
  if (period === "weekly") {
    const start = getWeekStart(now);
    return { start, end: new Date(start.getTime() + 7 * 86_400_000) };
  }
  // monthly
  const start = getMonthStart(now);
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      1,
      STUDY_DAY_RESET_HOUR_UTC,
      0,
      0,
      0,
    ),
  );
  return { start, end };
}

/** Seconds until the end of the current period (minimum 60). */
export function getPeriodTtlSeconds(period: Period, now: Date): number {
  const { end } = getPeriodWindow(period, now);
  return Math.max(60, Math.ceil((end.getTime() - now.getTime()) / 1_000));
}
