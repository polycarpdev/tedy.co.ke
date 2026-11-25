// api/src/db.mjs
import './env.mjs';
import pg from 'pg';

export const pool = new pg.Pool({
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
