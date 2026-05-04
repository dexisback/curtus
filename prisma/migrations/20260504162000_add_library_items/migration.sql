-- CreateEnum
CREATE TYPE "LibraryMediaKind" AS ENUM ('VIDEO', 'PLAYLIST');

-- CreateTable
CREATE TABLE "library_items" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaKind" "LibraryMediaKind" NOT NULL,
    "videoId" TEXT,
    "playlistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_items_userId_updatedAt_idx" ON "library_items"("userId", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
