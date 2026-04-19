-- AlterTable users: lifetime total + drop pomodoro/break prefs
ALTER TABLE "users" DROP COLUMN "pomodoroDuration",
DROP COLUMN "breakDuration",
ADD COLUMN "lifetimeFocusMinutes" INTEGER NOT NULL DEFAULT 0;

-- Backfill lifetime minutes from existing session logs
UPDATE "users" u
SET "lifetimeFocusMinutes" = COALESCE((
  SELECT SUM(f."durationMin")::integer FROM "focus_sessions" f WHERE f."userId" = u."id"
), 0);

-- AlterTable rooms
ALTER TABLE "rooms" DROP COLUMN "pomodoroDuration",
DROP COLUMN "breakDuration";

-- AlterTable focus_sessions + drop TimerMode enum
ALTER TABLE "focus_sessions" DROP COLUMN "timerMode";

DROP TYPE "TimerMode";
