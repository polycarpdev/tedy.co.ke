// api/src/notify.mjs
import { pool } from './db.mjs';

export async function notify(kind, title, link = '') {
  await pool.query(
    'INSERT INTO notifications (kind, title, link) VALUES ($1, $2, $3)',
    [kind, title, link]
  );
}
