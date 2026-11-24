// api/src/routes/journey.mjs
import { Router } from 'express';
import { pool } from '../db.mjs';
import { notify } from '../notify.mjs';

export const journey = Router();

export async function journeyState() {
  const [j, p] = await Promise.all([
    pool.query(
      `SELECT title, depart_at, arrive_at, show_from, show_until, stopped, stopped_at,
              paused_seconds, note, updated_at FROM journey WHERE id = 1`
    ),
    pool.query('SELECT id, position, name, km, planned_at, passed_at FROM journey_points ORDER BY position, id'),
  ]);
  return { journey: j.rows[0] || null, points: p.rows.map((r) => ({ ...r, km: Number(r.km) })) };
}

const send = async (res) => res.json(await journeyState());

journey.get('/journey', async (_req, res) => send(res));

journey.put('/journey', async (req, res) => {
  const b = req.body || {};
  await pool.query(
    `UPDATE journey SET
       title = COALESCE($1, title),
       depart_at = COALESCE($2, depart_at),
       arrive_at = COALESCE($3, arrive_at),
       show_from = COALESCE($4, show_from),
       show_until = COALESCE($5, show_until),
       updated_at = now()
     WHERE id = 1`,
    [b.title || null, b.depart_at || null, b.arrive_at || null, b.show_from || null, b.show_until || null]
  );
  send(res);
});

journey.put('/journey/points', async (req, res) => {
  const list = Array.isArray(req.body?.points) ? req.body.points : null;
  if (!list || list.length < 2) return res.status(400).json({ error: 'Add at least a start and an end.' });
  for (const p of list) {
    if (!String(p.name || '').trim() || !Number.isFinite(Number(p.km)) || !p.planned_at) {
      return res.status(400).json({ error: 'Each checkpoint needs a name, km and time.' });
    }
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const keep = list.filter((p) => p.id).map((p) => Number(p.id));
    await client.query('DELETE FROM journey_points WHERE NOT (id = ANY($1::int[]))', [keep]);
    for (const [i, p] of list.entries()) {
      const name = String(p.name).trim().slice(0, 80);
      if (p.id) {
        await client.query(
          'UPDATE journey_points SET position = $2, name = $3, km = $4, planned_at = $5 WHERE id = $1',
          [Number(p.id), i, name, Number(p.km), p.planned_at]
        );
      } else {
        await client.query(
          'INSERT INTO journey_points (position, name, km, planned_at) VALUES ($1, $2, $3, $4)',
          [i, name, Number(p.km), p.planned_at]
        );
      }
    }
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Could not save the checkpoints.' });
  } finally {
    client.release();
  }
  send(res);
});

journey.post('/journey/pass', async (_req, res) => {
  const { rows } = await pool.query(
    `UPDATE journey_points SET passed_at = now()
     WHERE id = (SELECT id FROM journey_points WHERE passed_at IS NULL ORDER BY position, id LIMIT 1)
     RETURNING name`
  );
  if (!rows[0]) return res.status(409).json({ error: 'Every checkpoint is already passed.' });
  await pool.query(
    `UPDATE journey SET stopped = false, stopped_at = NULL, paused_seconds = 0, note = '', updated_at = now() WHERE id = 1`
  );
  notify('journey', `Passed ${rows[0].name}`, 'journey').catch(() => {});
  send(res);
});

journey.post('/journey/undo', async (_req, res) => {
  await pool.query(
    `UPDATE journey_points SET passed_at = NULL
     WHERE id = (SELECT id FROM journey_points WHERE passed_at IS NOT NULL ORDER BY position DESC, id DESC LIMIT 1)`
  );
  await pool.query('UPDATE journey SET updated_at = now() WHERE id = 1');
  send(res);
});

journey.post('/journey/stop', async (req, res) => {
  const note = String(req.body?.note || '').trim().slice(0, 140);
  await pool.query(
    `UPDATE journey SET stopped = true, stopped_at = COALESCE(stopped_at, now()), note = $1, updated_at = now() WHERE id = 1`,
    [note]
  );
  send(res);
});

journey.post('/journey/go', async (_req, res) => {
  await pool.query(
    `UPDATE journey SET
       paused_seconds = paused_seconds + COALESCE(EXTRACT(EPOCH FROM now() - stopped_at)::int, 0),
       stopped = false, stopped_at = NULL, note = '', updated_at = now()
     WHERE id = 1`
  );
  send(res);
});

journey.post('/journey/reset', async (_req, res) => {
  await pool.query('UPDATE journey_points SET passed_at = NULL');
  await pool.query(
    `UPDATE journey SET stopped = false, stopped_at = NULL, paused_seconds = 0, note = '', updated_at = now() WHERE id = 1`
  );
  send(res);
});
