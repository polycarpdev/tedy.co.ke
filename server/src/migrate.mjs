// api/src/migrate.mjs
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './env.mjs';
import { pool } from './db.mjs';

const dir = path.join(ROOT, 'migrations');
const client = await pool.connect();

try {
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
  );
  const { rows } = await client.query('SELECT name FROM schema_migrations');
  const done = new Set(rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(dir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
  console.log('Migrations up to date');
} finally {
  client.release();
  await pool.end();
}
