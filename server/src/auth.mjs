// api/src/auth.mjs
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const COOKIE = 'tedy_admin';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const hashPassword = (p) => bcrypt.hash(p, 12);
export const checkPassword = (p, h) => bcrypt.compare(p, h);

export function setSession(res, admin) {
  const token = jwt.sign({ sub: admin.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api',
    maxAge: MAX_AGE,
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/api' });
}

export function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.adminId = jwt.verify(token, process.env.JWT_SECRET).sub;
    next();
  } catch {
    clearSession(res);
    res.status(401).json({ error: 'Session expired' });
  }
}
