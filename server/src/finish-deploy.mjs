// api/src/finish-deploy.mjs
import { pool } from './db.mjs';
import { notify } from './notify.mjs';

const state = process.argv[2] === 'failed' ? 'failed' : 'live';
const { rowCount } = await pool.query(
  `UPDATE builds SET status = $1, finished_at = now() WHERE status IN ('queued', 'deploying')`,
  [state]
);
if (!rowCount && state === 'live') {
  await pool.query(`INSERT INTO builds (status, note, finished_at) VALUES ('live', 'Code update', now())`);
}
await notify(
  'publish',
  state === 'live' ? 'Site is live with your latest changes' : 'Deploy failed on the server. Check tedy-deploy.log',
  'overview'
);
await pool.end();
