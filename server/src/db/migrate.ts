import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './pool.js';

// Migrations live in server/migrations as plain .sql files, applied in filename
// order (001_..., 002_..., ...). Each is run once, inside a transaction, and
// recorded in the schema_migrations table so re-running this script only
// applies new files. (This module is at server/src/db, so go up two levels.)
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const applied = new Set(rows.map((r) => r.filename));

    const allFiles = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
    const pending = allFiles.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('✓ Database is up to date — no pending migrations.');
      return;
    }

    for (const file of pending) {
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      console.log(`→ Applying ${file} ...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }

    console.log(`✓ Applied ${pending.length} migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err: unknown) => {
  console.error('✗ Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
