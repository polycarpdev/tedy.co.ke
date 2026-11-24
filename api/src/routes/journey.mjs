// api/src/routes/journey.mjs
import { Router } from 'express';
import { pool } from '../db.mjs';
import { notify } from '../notify.mjs';

export const journey = Router();

export async function journeyState() {
  const [j, p] = await Promise.all([
    pool.query(
      `SELECT title, depart_at, arrive_at, show_from, show_until, stopped, stopped_at,
              paused_seconds, note, updated_at, (plan_backup IS NOT NULL) AS rehearsal FROM journey WHERE id = 1`
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

journey.post('/journey/rehearse', async (req, res) => {
  const minutes = Math.min(Math.max(Number(req.body?.minutes) || 15, 5), 120);
  const { rows: jr } = await pool.query('SELECT depart_at, arrive_at, plan_backup FROM journey WHERE id = 1');
  const { rows: pts } = await pool.query('SELECT id, km, planned_at FROM journey_points ORDER BY position, id');
  if (!jr[0] || pts.length < 2) return res.status(400).json({ error: 'Set up the route first.' });
  const backup = jr[0].plan_backup || {
    depart_at: jr[0].depart_at,
    arrive_at: jr[0].arrive_at,
    points: pts.map((p) => ({ id: p.id, planned_at: p.planned_at })),
  };
  const start = Date.now() + 60000;
  const dur = minutes * 60000;
  const max = Number(pts[pts.length - 1].km) || 1;
  for (const p of pts) {
    await pool.query('UPDATE journey_points SET planned_at = $2, passed_at = NULL WHERE id = $1', [
      p.id,
      new Date(start + (Number(p.km) / max) * dur),
    ]);
  }
  await pool.query(
    `UPDATE journey SET depart_at = $1, arrive_at = $2, plan_backup = $3, stopped = false, stopped_at = NULL,
       paused_seconds = 0, note = '', updated_at = now() WHERE id = 1`,
    [new Date(start), new Date(start + dur), JSON.stringify(backup)]
  );
  send(res);
});

journey.post('/journey/restore', async (_req, res) => {
  const { rows } = await pool.query('SELECT plan_backup FROM journey WHERE id = 1');
  const b = rows[0]?.plan_backup;
  if (!b) return res.status(409).json({ error: 'There is no rehearsal to undo.' });
  for (const p of b.points) {
    await pool.query('UPDATE journey_points SET planned_at = $2, passed_at = NULL WHERE id = $1', [p.id, p.planned_at]);
  }
  await pool.query(
    `UPDATE journey SET depart_at = $1, arrive_at = $2, plan_backup = NULL, stopped = false, stopped_at = NULL,
       paused_seconds = 0, note = '', updated_at = now() WHERE id = 1`,
    [b.depart_at, b.arrive_at]
  );
  send(res);
});
