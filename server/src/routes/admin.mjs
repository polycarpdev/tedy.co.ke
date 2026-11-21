// api/src/routes/admin.mjs
import { Router } from 'express';
import { pool } from '../db.mjs';
import { requireAdmin } from '../auth.mjs';
import { notify } from '../notify.mjs';
import { touch } from '../meta.mjs';
import { stops } from './stops.mjs';
import { condolences } from './condolences.mjs';

export const admin = Router();
admin.use(requireAdmin);

admin.use((req, res, next) => {
  if (req.method !== 'GET' && !req.path.startsWith('/notifications') && !req.path.startsWith('/publish')) {
    res.on('finish', () => {
      if (res.statusCode < 400) touch().catch(() => {});
    });
  }
  next();
});

admin.get('/summary', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM stops) AS stops,
      (SELECT count(*)::int FROM media) AS media,
      (SELECT count(*)::int FROM condolences WHERE status = 'pending') AS pending,
      (SELECT count(*)::int FROM condolences WHERE status = 'approved') AS approved,
      (SELECT count(*)::int FROM candles) AS candles
  `);
  res.json(rows[0]);
});

admin.get('/notifications', async (_req, res) => {
  const [items, unread] = await Promise.all([
    pool.query('SELECT id, kind, title, link, read_at, created_at FROM notifications ORDER BY created_at DESC LIMIT 30'),
    pool.query('SELECT count(*)::int AS n FROM notifications WHERE read_at IS NULL'),
  ]);
  res.json({ items: items.rows, unread: unread.rows[0].n });
});

admin.post('/notifications/read', async (_req, res) => {
  await pool.query('UPDATE notifications SET read_at = now() WHERE read_at IS NULL');
  res.json({ ok: true });
});

admin.post('/notifications/:id/read', async (req, res) => {
  await pool.query(
    'UPDATE notifications SET read_at = now() WHERE id = $1 AND read_at IS NULL',
    [Number(req.params.id)]
  );
  res.json({ ok: true });
});

const STUCK_MS = 20 * 60 * 1000;

async function publishState() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT row_to_json(b) FROM (
        SELECT id, status, created_at, finished_at FROM builds ORDER BY id DESC LIMIT 1
      ) b) AS last,
      (SELECT max(created_at) FROM builds WHERE status = 'live') AS live_at,
      (SELECT updated_at FROM meta WHERE key = 'content_changed_at') AS changed_at
  `);
  const { last, live_at, changed_at } = rows[0];
  const running =
    !!last && ['queued', 'deploying'].includes(last.status) &&
    Date.now() - new Date(last.created_at).getTime() < STUCK_MS;
  const changed = !live_at || (!!changed_at && new Date(changed_at) > new Date(live_at));
  return { running, changed, last, live_at };
}

admin.get('/publish', async (_req, res) => {
  res.json(await publishState());
});

admin.post('/publish', async (_req, res) => {
  const state = await publishState();
  if (state.running) return res.status(409).json({ error: 'A publish is already running' });

  const token = process.env.GH_DISPATCH_TOKEN;
  const repo = process.env.GH_REPO;
  if (!token || !repo) return res.status(500).json({ error: 'Publishing is not configured on the server' });

  const { rows } = await pool.query(
    `INSERT INTO builds (status, note) VALUES ('queued', 'Published from admin') RETURNING id`
  );
  const gh = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/build.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'tedy-api',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (!gh.ok) {
    await pool.query(`UPDATE builds SET status = 'failed', finished_at = now() WHERE id = $1`, [rows[0].id]);
    return res.status(502).json({ error: `GitHub refused the publish (${gh.status})` });
  }
  await notify('publish', 'Publishing started', 'overview');
  res.json(await publishState());
});

admin.use(stops);
admin.use(condolences);
