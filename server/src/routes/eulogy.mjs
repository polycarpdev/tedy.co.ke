// api/src/routes/eulogy.mjs
import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db.mjs';
import { notify } from '../notify.mjs';
import { savePhoto, removeMedia } from '../media.mjs';

export const eulogy = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

async function listPages() {
  const { rows } = await pool.query(
    `SELECT id, file, width, height, position FROM media WHERE kind = 'page' ORDER BY position, id`
  );
  return rows;
}

eulogy.get('/eulogy', async (_req, res) => {
  res.json({ pages: await listPages() });
});

eulogy.post('/eulogy/pages', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Page image missing' });
  const saved = await savePhoto(req.file.buffer);
  await pool.query(
    `INSERT INTO media (stop_id, kind, file, width, height, position)
     VALUES (NULL, 'page', $1, $2, $3, (SELECT coalesce(max(position), 0) + 1 FROM media WHERE kind = 'page'))`,
    [saved.file, saved.width, saved.height]
  );
  res.status(201).json({ pages: await listPages() });
});

eulogy.delete('/eulogy', async (_req, res) => {
  const pages = await listPages();
  await pool.query(`DELETE FROM media WHERE kind = 'page'`);
  for (const p of pages) await removeMedia(p.file);
  res.json({ pages: [] });
});

eulogy.post('/eulogy/done', async (req, res) => {
  const count = Math.max(0, Math.min(200, Number(req.body?.count) || 0));
  if (count) await notify('eulogy', `Eulogy uploaded: ${count} page${count === 1 ? '' : 's'}`, 'eulogy');
  res.json({ ok: true });
});
