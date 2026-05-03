-- Leaderboard / period aggregates filter by date range across users; date-first helps scans.
CREATE INDEX IF NOT EXISTS "daily_stats_date_userId_idx" ON "daily_stats" ("date", "userId");
