// api/src/routes/admin.mjs
import { Router } from 'express';
import { pool } from '../db.mjs';
import { requireAdmin } from '../auth.mjs';
import { stops } from './stops.mjs';

export const admin = Router();
admin.use(requireAdmin);

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

admin.use(stops);
