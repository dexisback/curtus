import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("PRISMA_DATABASE_URL"),
  },
});

// — prisma.config.ts: Prisma CLI — schema path, migrations dir, datasource from PRISMA_DATABASE_URL.
