-- Public / board room lists: filter isPublic + ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS "rooms_isPublic_createdAt_idx" ON "rooms" ("isPublic", "createdAt" DESC);

-- Host join on room cards
CREATE INDEX IF NOT EXISTS "rooms_hostId_idx" ON "rooms" ("hostId");

-- My memberships: WHERE userId = ? ORDER BY joinedAt DESC
CREATE INDEX IF NOT EXISTS "room_members_userId_joinedAt_idx" ON "room_members" ("userId", "joinedAt" DESC);
