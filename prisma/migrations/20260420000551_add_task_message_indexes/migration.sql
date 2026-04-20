-- CreateIndex
CREATE INDEX "messages_roomId_createdAt_idx" ON "messages"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "tasks_userId_createdAt_idx" ON "tasks"("userId", "createdAt");
