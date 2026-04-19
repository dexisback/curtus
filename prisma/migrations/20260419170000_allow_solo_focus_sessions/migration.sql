-- Allow personal timer sessions outside rooms and add leaderboard hot-path indexes.
ALTER TABLE "focus_sessions" DROP CONSTRAINT "focus_sessions_roomId_fkey";

ALTER TABLE "focus_sessions"
ALTER COLUMN "roomId" DROP NOT NULL;

ALTER TABLE "focus_sessions"
ADD CONSTRAINT "focus_sessions_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "focus_sessions_userId_completedAt_idx"
ON "focus_sessions"("userId", "completedAt");

CREATE INDEX "daily_stats_userId_date_idx"
ON "daily_stats"("userId", "date");
