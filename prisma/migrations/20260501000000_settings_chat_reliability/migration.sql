-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "clientNonce" TEXT;

-- CreateTable
CREATE TABLE "user_settings" (
    "userId" TEXT NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'LIGHT',
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "compactSidebar" BOOLEAN NOT NULL DEFAULT false,
    "sessionReminders" BOOLEAN NOT NULL DEFAULT true,
    "friendActivity" BOOLEAN NOT NULL DEFAULT false,
    "roomInvites" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardUpdates" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "messages_roomId_userId_clientNonce_key" ON "messages"("roomId", "userId", "clientNonce");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
