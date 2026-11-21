// api/src/routes/condolences.mjs
import { Router } from 'express';
import { pool } from '../db.mjs';

export const condolences = Router();

const STATUSES = ['pending', 'approved', 'rejected'];
const COLS = 'id, name, relation, message, status, created_at, reviewed_at';

condolences.get('/condolences', async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : 'pending';
  const [list, counts] = await Promise.all([
    pool.query(`SELECT ${COLS} FROM condolences WHERE status = $1 ORDER BY created_at DESC LIMIT 200`, [status]),
    pool.query('SELECT status, count(*)::int AS n FROM condolences GROUP BY status'),
  ]);
  const c = { pending: 0, approved: 0, rejected: 0 };
  counts.rows.forEach((r) => {
    c[r.status] = r.n;
  });
  res.json({ items: list.rows, counts: c });
});

condolences.get('/condolences/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT ${COLS} FROM condolences WHERE id = $1`, [Number(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

condolences.post('/condolences/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const { rows } = await pool.query(
    `UPDATE condolences SET status = $2, reviewed_at = now() WHERE id = $1 RETURNING ${COLS}`,
    [Number(req.params.id), status]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

condolences.delete('/condolences/:id', async (req, res) => {
  await pool.query('DELETE FROM condolences WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});
