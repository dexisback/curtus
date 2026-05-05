import "dotenv/config";
import { defineConfig } from "@prisma/config";

const prismaUrl = process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(prismaUrl ? { datasource: { url: prismaUrl } } : {}),
});

// — prisma.config.ts: Prisma CLI — schema path, migrations dir, datasource from PRISMA_DATABASE_URL.
