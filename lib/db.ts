import "dotenv/config";
import { PrismaClient } from "@generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({ adapter });

// — db.ts: Shared Prisma client with Neon serverless adapter. Used by API routes, jobs, and Better Auth.
