import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration(filename: string): Promise<void> {
  const filepath = resolve(__dirname, '../../migrations', filename);
  const sql = readFileSync(filepath, 'utf8');
  await pool.query(sql);
  console.log(`[Migrate] ✅ ${filename}`);
}

async function main() {
  try {
    await runMigration('001_initial_schema.sql');
    console.log('[Migrate] All migrations completed');
  } catch (err) {
    console.error('[Migrate] Failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
