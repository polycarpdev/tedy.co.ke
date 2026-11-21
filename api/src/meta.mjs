// api/src/meta.mjs
import { pool } from './db.mjs';

export function touch() {
  return pool.query(
    `INSERT INTO meta (key, updated_at) VALUES ('content_changed_at', now())
     ON CONFLICT (key) DO UPDATE SET updated_at = now()`
  );
}
