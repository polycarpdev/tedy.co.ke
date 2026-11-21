// api/src/routes/public.mjs
import { Router } from 'express';
import { pool } from '../db.mjs';

export const publicRoutes = Router();

publicRoutes.get('/content', async (_req, res) => {
  const { rows: stops } = await pool.query(
    `SELECT id, slug, year, title, line, body, outfit, accessory
     FROM stops WHERE published ORDER BY position, id`
  );
  const { rows: media } = await pool.query(
    `SELECT stop_id, file, width, height, caption, alt, is_cover
     FROM media WHERE kind = 'photo' AND stop_id = ANY($1::int[])
     ORDER BY position, id`,
    [stops.map((s) => s.id)]
  );
  res.set('Cache-Control', 'no-store');
  res.json({
    generated_at: new Date().toISOString(),
    stops: stops.map(({ id, ...s }) => ({
      ...s,
      media: media.filter((m) => m.stop_id === id).map(({ stop_id, ...m }) => m),
    })),
  });
});
