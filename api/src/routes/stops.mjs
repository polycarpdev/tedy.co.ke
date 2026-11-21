// api/src/routes/stops.mjs
import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db.mjs';
import { notify } from '../notify.mjs';
import { savePhoto, removeMedia } from '../media.mjs';

export const stops = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

const OUTFITS = ['jersey', 'army', 'casual'];
const ACCESSORIES = ['none', 'camera', 'headphones'];
const STOP_COLS = 'id, slug, position, year, year_end, year_label, place, title, line, body, outfit, accessory, published';
const MEDIA_COLS = 'id, stop_id, kind, file, width, height, caption, alt, position, is_cover, by_tedy';

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const validYear = (y) => Number.isInteger(y) && y >= 1900 && y <= 2100;
const toYear = (v) => (validYear(Number(v)) ? Number(v) : new Date().getFullYear());
const toYearOrNull = (v) => (v === null || v === undefined || v === '' ? null : validYear(Number(v)) ? Number(v) : null);
const notFound = (res) => res.status(404).json({ error: 'Not found' });
const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 60) || 'stop';

async function uniqueSlug(text, exceptId = 0) {
  const base = slugify(text);
  let slug = base;
  let n = 1;
  while ((await pool.query('SELECT 1 FROM stops WHERE slug = $1 AND id <> $2', [slug, exceptId])).rowCount) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function listMedia(stopId) {
  const { rows } = await pool.query(
    `SELECT ${MEDIA_COLS} FROM media WHERE stop_id = $1 AND kind = 'photo' ORDER BY position, id`,
    [stopId]
  );
  return rows;
}

async function renumber(table, ids) {
  await pool.query(
    `UPDATE ${table} t SET position = d.pos
     FROM (SELECT unnest($1::int[]) AS id, generate_series(1, cardinality($1::int[])) AS pos) d
     WHERE t.id = d.id`,
    [ids]
  );
}

function moveIn(ids, id, dir) {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
}

async function getStop(id) {
  const { rows } = await pool.query(`SELECT ${STOP_COLS} FROM stops WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  return { ...rows[0], media: await listMedia(id) };
}

stops.get('/stops', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT s.id, s.slug, s.position, s.year, s.year_end, s.year_label, s.place, s.title, s.line,
      s.published, s.outfit, s.accessory,
      (SELECT count(*)::int FROM media m WHERE m.stop_id = s.id AND m.kind = 'photo') AS media_count,
      (SELECT file FROM media c WHERE c.stop_id = s.id AND c.kind = 'photo'
        ORDER BY c.is_cover DESC, c.position, c.id LIMIT 1) AS cover
    FROM stops s ORDER BY s.position, s.id
  `);
  res.json(rows);
});

stops.post('/stops', async (req, res) => {
  const title = clean(req.body?.title, 80) || 'New stop';
  const slug = await uniqueSlug(title);
  const { rows } = await pool.query(
    `INSERT INTO stops (slug, position, year, title, outfit, accessory)
     VALUES ($1, (SELECT coalesce(max(position), 0) + 1 FROM stops), $2, $3, 'casual', 'none')
     RETURNING id`,
    [slug, toYear(req.body?.year), title]
  );
  await notify('stop', `Stop added: ${title}`, `stops/${rows[0].id}`);
  res.status(201).json(rows[0]);
});

stops.get('/stops/:id', async (req, res) => {
  const stop = await getStop(Number(req.params.id));
  if (!stop) return notFound(res);
  res.json(stop);
});

stops.put('/stops/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const title = clean(b.title, 80);
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const year = toYear(b.year);
  const yearEnd = toYearOrNull(b.year_end);
  if (yearEnd !== null && yearEnd < year) {
    return res.status(400).json({ error: 'End year cannot be before the start year' });
  }
  const slug = await uniqueSlug(clean(b.slug, 60) || title, id);
  const { rowCount } = await pool.query(
    `UPDATE stops SET slug = $2, title = $3, year = $4, year_end = $5, year_label = $6, place = $7,
       line = $8, body = $9, outfit = $10, accessory = $11, published = $12, updated_at = now()
     WHERE id = $1`,
    [
      id,
      slug,
      title,
      year,
      yearEnd,
      clean(b.year_label, 30),
      clean(b.place, 120),
      clean(b.line, 220),
      clean(b.body, 20000),
      OUTFITS.includes(b.outfit) ? b.outfit : 'casual',
      ACCESSORIES.includes(b.accessory) ? b.accessory : 'none',
      b.published !== false,
    ]
  );
  if (!rowCount) return notFound(res);
  res.json(await getStop(id));
});

stops.delete('/stops/:id', async (req, res) => {
  const id = Number(req.params.id);
  const media = await listMedia(id);
  await pool.query('DELETE FROM media WHERE stop_id = $1', [id]);
  const { rows } = await pool.query('DELETE FROM stops WHERE id = $1 RETURNING title', [id]);
  if (!rows[0]) return notFound(res);
  for (const m of media) await removeMedia(m.file);
  const ids = (await pool.query('SELECT id FROM stops ORDER BY position, id')).rows.map((r) => r.id);
  await renumber('stops', ids);
  await notify('stop', `Stop deleted: ${rows[0].title}`, 'stops');
  res.json({ ok: true });
});

stops.post('/stops/:id/move', async (req, res) => {
  const ids = (await pool.query('SELECT id FROM stops ORDER BY position, id')).rows.map((r) => r.id);
  const next = moveIn(ids, Number(req.params.id), Number(req.body?.dir) < 0 ? -1 : 1);
  if (next) await renumber('stops', next);
  res.json({ ok: true });
});

stops.post('/stops/:id/media', upload.single('file'), async (req, res) => {
  const stopId = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'Use a JPG, PNG or WebP photo' });
  const exists = await pool.query('SELECT 1 FROM stops WHERE id = $1', [stopId]);
  if (!exists.rowCount) return notFound(res);
  const saved = await savePhoto(req.file.buffer);
  await pool.query(
    `INSERT INTO media (stop_id, kind, file, width, height, position, is_cover)
     VALUES ($1, 'photo', $2, $3, $4,
       (SELECT coalesce(max(position), 0) + 1 FROM media WHERE stop_id = $1),
       NOT EXISTS (SELECT 1 FROM media WHERE stop_id = $1 AND kind = 'photo'))`,
    [stopId, saved.file, saved.width, saved.height]
  );
  res.status(201).json({ media: await listMedia(stopId) });
});

stops.post('/stops/:id/media/done', async (req, res) => {
  const count = Math.max(0, Math.min(500, Number(req.body?.count) || 0));
  const { rows } = await pool.query('SELECT title FROM stops WHERE id = $1', [Number(req.params.id)]);
  if (count && rows[0]) {
    await notify('media', `${count} photo${count === 1 ? '' : 's'} added to ${rows[0].title}`, `stops/${req.params.id}`);
  }
  res.json({ ok: true });
});

stops.put('/media/:id', async (req, res) => {
  const b = req.body || {};
  const sets = [];
  const vals = [Number(req.params.id)];
  if (b.caption !== undefined) {
    vals.push(clean(b.caption, 300));
    sets.push(`caption = $${vals.length}, alt = $${vals.length}`);
  }
  if (b.by_tedy !== undefined) {
    vals.push(Boolean(b.by_tedy));
    sets.push(`by_tedy = $${vals.length}`);
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  const { rows } = await pool.query(`UPDATE media SET ${sets.join(', ')} WHERE id = $1 RETURNING stop_id`, vals);
  if (!rows[0]) return notFound(res);
  res.json({ media: await listMedia(rows[0].stop_id) });
});

stops.post('/media/:id/cover', async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query('SELECT stop_id FROM media WHERE id = $1', [id]);
  if (!rows[0]) return notFound(res);
  await pool.query(`UPDATE media SET is_cover = (id = $1) WHERE stop_id = $2 AND kind = 'photo'`, [id, rows[0].stop_id]);
  res.json({ media: await listMedia(rows[0].stop_id) });
});

stops.post('/media/:id/move', async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query('SELECT stop_id FROM media WHERE id = $1', [id]);
  if (!rows[0]) return notFound(res);
  const ids = (await listMedia(rows[0].stop_id)).map((m) => m.id);
  const next = moveIn(ids, id, Number(req.body?.dir) < 0 ? -1 : 1);
  if (next) await renumber('media', next);
  res.json({ media: await listMedia(rows[0].stop_id) });
});

stops.delete('/media/:id', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM media WHERE id = $1 RETURNING stop_id, file, is_cover',
    [Number(req.params.id)]
  );
  if (!rows[0]) return notFound(res);
  const { stop_id, file, is_cover } = rows[0];
  await removeMedia(file);
  if (is_cover) {
    await pool.query(
      `UPDATE media SET is_cover = true WHERE id = (
         SELECT id FROM media WHERE stop_id = $1 AND kind = 'photo' ORDER BY position, id LIMIT 1)`,
      [stop_id]
    );
  }
  res.json({ media: await listMedia(stop_id) });
});
