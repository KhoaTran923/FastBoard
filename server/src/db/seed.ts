import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool, { query } from './pool.js';

// Test users
const TEST_USERS = [
  { email: 'bob@fastboard.dev', full_name: 'Bob Carter' },
  { email: 'james@fastboard.dev', full_name: 'James Lee' },
  { email: 'alice@fastboard.dev', full_name: 'Alice Nguyen' },
  { email: 'sophia@fastboard.dev', full_name: 'Sophia Pham' },
  { email: 'david@fastboard.dev', full_name: 'David Tran' },
];
const PASSWORD = 'Password1';

async function seed(): Promise<void> {
  const hashed = await bcrypt.hash(PASSWORD, 10);
  let added = 0;
  for (const user of TEST_USERS) {
    const rows = await query(
      `INSERT INTO users (email, password, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [user.email, hashed, user.full_name]
    );
    if (rows.length > 0) added += 1;
  }
  console.log(`✓ Seed complete — ${added} new test user(s) added (${TEST_USERS.length} total).`);
  console.log(`  Emails: ${TEST_USERS.map((u) => u.email).join(', ')}`);
  console.log(`  Password for all: ${PASSWORD}`);
  await pool.end();
}

seed().catch((err: unknown) => {
  console.error('✗ Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
