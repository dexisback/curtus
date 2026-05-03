export const STUDY_DAY_RESET_HOUR_UTC = 5;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

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

export function getWeekStart(date: Date): Date {
  const dayStart = getStudyDayStart(date);
  const dow = dayStart.getUTCDay();
  const diff = dow === 0 ? 6 : dow - 1;
  return new Date(dayStart.getTime() - diff * 86_400_000);
}

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

export function getDailyKey(date: Date): string {
  const d = getStudyDayStart(date);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function getWeeklyKey(date: Date): string {
  const w = getWeekStart(date);
  const jan4 = new Date(Date.UTC(w.getUTCFullYear(), 0, 4, STUDY_DAY_RESET_HOUR_UTC));
  const weekNum = Math.ceil(((w.getTime() - jan4.getTime()) / 86_400_000 + 4) / 7);
  return `${w.getUTCFullYear()}-W${pad(weekNum)}`;
}

export function getMonthlyKey(date: Date): string {
  const m = getMonthStart(date);
  return `${m.getUTCFullYear()}-${pad(m.getUTCMonth() + 1)}`;
}

export type Period = "daily" | "weekly" | "monthly";

export function getPeriodWindow(
  period: Period,
  now: Date,
): { start: Date; end: Date } {
  switch (period) {
    case "daily": {
      const start = getStudyDayStart(now);
      return { start, end: new Date(start.getTime() + 86_400_000) };
    }
    case "weekly": {
      const start = getWeekStart(now);
      return { start, end: new Date(start.getTime() + 7 * 86_400_000) };
    }
    case "monthly": {
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
  }
}

export function getPeriodTtlSeconds(period: Period, now: Date): number {
  const { end } = getPeriodWindow(period, now);
  return Math.max(60, Math.ceil((end.getTime() - now.getTime()) / 1_000));
}

// — periods.ts: Study-day calendar (05:00 UTC) and Redis key period helpers for the socket server.
