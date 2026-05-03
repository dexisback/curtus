import "dotenv/config";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../../generated/prisma";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL for socket server.");
}

const adapter = new PrismaNeon({
  connectionString,
});

declare global {
  var studyWithMeSocketPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.studyWithMeSocketPrisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.studyWithMeSocketPrisma = prisma;
}

// — db.ts: Prisma + Neon for the socket server process (dev singleton on global).

