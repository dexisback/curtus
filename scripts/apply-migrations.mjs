import "dotenv/config";
import dns from "node:dns";

const resolver = new dns.promises.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

// Override the default lookup so undici (used by fetch) goes through our resolver.
const origLookup = dns.lookup;
dns.lookup = (hostname, options, cb) => {
  const callback = typeof options === "function" ? options : cb;
  const opts = typeof options === "object" ? options : {};

  resolver
    .resolve4(hostname)
    .then((addresses) => {
      if (!addresses.length) throw new Error("no addresses");
      if (opts.all) {
        callback(null, addresses.map((a) => ({ address: a, family: 4 })));
      } else {
        callback(null, addresses[0], 4);
      }
    })
    .catch(() => {
      origLookup(hostname, options, cb);
    });
};

import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";

const MIGRATIONS_DIR = "prisma/migrations";
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(url);

const pool = {
  query: async (text, params = []) => {
    const rows = await sql.query(text, params);
    return { rows };
  },
  end: async () => {},
};

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INT NOT NULL DEFAULT 0
    );
  `);
}

async function getApplied() {
  const { rows } = await pool.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
  );
  return new Set(rows.map((r) => r.migration_name));
}

function splitSql(sql) {
  // Naive split on `;` at end of line — sufficient for Prisma-generated migrations.
  return sql
    .split(/;[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--") || s.includes("\n"));
}

async function applyMigration(name) {
  const path = join(MIGRATIONS_DIR, name, "migration.sql");
  const sql = await readFile(path, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const id = randomUUID();

  console.log(`\n→ Applying ${name}`);
  await pool.query(
    `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at)
     VALUES ($1, $2, $3, now())`,
    [id, checksum, name],
  );

  const statements = splitSql(sql);
  let count = 0;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      count++;
    } catch (err) {
      console.error(`  ✖ Failed at statement ${count + 1}:`);
      console.error(`    ${stmt.slice(0, 120)}…`);
      console.error(`    ${err.message}`);
      throw err;
    }
  }

  await pool.query(
    `UPDATE "_prisma_migrations"
     SET finished_at = now(), applied_steps_count = $1
     WHERE id = $2`,
    [count, id],
  );
  console.log(`  ✓ ${count} statements applied`);
}

async function main() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const dirs = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let appliedCount = 0;
  for (const name of dirs) {
    if (applied.has(name)) {
      console.log(`✓ Already applied: ${name}`);
      continue;
    }
    await applyMigration(name);
    appliedCount++;
  }

  console.log(`\nDone. ${appliedCount} new migration(s) applied, ${applied.size + appliedCount} total.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
