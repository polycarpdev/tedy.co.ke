// api/src/routes/auth.mjs
import { Router } from 'express';
import { pool } from '../db.mjs';
import { checkPassword, setSession, clearSession, requireAdmin } from '../auth.mjs';
import { limit } from '../limit.mjs';
import { notify } from '../notify.mjs';

export const auth = Router();

auth.post('/login', limit(8, 15 * 60 * 1000), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash FROM admins WHERE email = $1',
    [email]
  );
  const admin = rows[0];
  if (!admin || !(await checkPassword(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  setSession(res, admin);
  await notify('login', `New sign-in from ${req.ip}`);
  res.json({ id: admin.id, name: admin.name, email: admin.email });
});

auth.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

auth.get('/me', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM admins WHERE id = $1', [req.adminId]);
  if (!rows[0]) return res.status(401).json({ error: 'Not signed in' });
  res.json(rows[0]);
});
