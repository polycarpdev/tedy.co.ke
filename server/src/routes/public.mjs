// api/src/routes/public.mjs
import express, { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db.mjs';
import { notify } from '../notify.mjs';
import { limit } from '../limit.mjs';
import { sendMail } from '../mail.mjs';

export const publicRoutes = Router();

const SITE = process.env.SITE_URL || 'https://tedy.co.ke';
const HOUR = 60 * 60 * 1000;

const clean = (v, max) => String(v ?? '').replace(/[ \t]+\n/g, '\n').trim().slice(0, max);
const ipHash = (ip) =>
  crypto.createHash('sha256').update(`${ip}:${process.env.JWT_SECRET}`).digest('hex').slice(0, 32);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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

publicRoutes.get('/condolences', async (req, res) => {
  const before = Number(req.query.before) || 2147483647;
  const [list, total] = await Promise.all([
    pool.query(
      `SELECT id, name, relation, message, created_at FROM condolences
       WHERE status = 'approved' AND id < $1 ORDER BY id DESC LIMIT 21`,
      [before]
    ),
    pool.query(`SELECT count(*)::int AS n FROM condolences WHERE status = 'approved'`),
  ]);
  res.set('Cache-Control', 'no-store');
  res.json({ items: list.rows.slice(0, 20), more: list.rows.length > 20, total: total.rows[0].n });
});

publicRoutes.post('/condolences', limit(5, HOUR), async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true });
  const name = clean(b.name, 80);
  const relation = clean(b.relation, 80);
  const message = clean(b.message, 2000);
  if (!name || !relation || message.length < 2) {
    return res.status(400).json({ error: 'Please add your name, where you know him from, and a message.' });
  }
  if ((message.match(/https?:\/\//g) || []).length > 2) {
    return res.status(400).json({ error: 'Please remove the links from your message.' });
  }
  const { rows } = await pool.query(
    'INSERT INTO condolences (name, relation, message, ip_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, relation, message, ipHash(req.ip)]
  );
  const id = rows[0].id;
  await notify('condolence', `New message from ${name}`, `condolences/${id}`);
  emailModerator({ id, name, relation, message }).catch(() => {});
  res.status(201).json({ ok: true });
});

function moderateLink(id, action) {
  const t = jwt.sign({ c: id, a: action }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return `${SITE}/api/public/moderate?t=${encodeURIComponent(t)}`;
}

async function emailModerator({ id, name, relation, message }) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  const approve = moderateLink(id, 'approved');
  const reject = moderateLink(id, 'rejected');
  const admin = `${SITE}/admin/#condolences/${id}`;
  const btn = (href, label, bg) =>
    `<a href="${href}" style="display:inline-block;padding:10px 18px;margin-right:8px;border-radius:6px;background:${bg};color:#fff;text-decoration:none;font-weight:600">${label}</a>`;
  const text = `${name} (${relation}) left a message for Tedy:\n\n${message}\n\nApprove: ${approve}\nReject: ${reject}\nOpen in admin: ${admin}\n`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1d1712">
    <p style="margin:0 0 6px;color:#6b6b6b;font-size:13px">New message on tedy.co.ke</p>
    <h2 style="margin:0 0 4px">${esc(name)}</h2>
    <p style="margin:0 0 16px;color:#6b6b6b">${esc(relation)}</p>
    <blockquote style="margin:0 0 20px;padding:12px 16px;border-left:3px solid #da291c;background:#f6f3ee;white-space:pre-wrap">${esc(message)}</blockquote>
    <p>${btn(approve, 'Approve', '#1f7a3a')}${btn(reject, 'Reject', '#8a8a8a')}</p>
    <p style="font-size:13px"><a href="${admin}" style="color:#da291c">Open in admin</a></p>
  </div>`;
  await sendMail({ to, subject: `New message for Tedy from ${name}`, text, html });
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#0b0e12;color:#e8e5df;font:16px/1.5 system-ui,sans-serif}
main{max-width:560px}h1{margin:0 0 8px;font-size:22px}p{color:#b8b4ad}
blockquote{margin:16px 0;padding:12px 16px;border-left:3px solid #da291c;background:#10151b;color:#e8e5df;white-space:pre-wrap}
button{padding:10px 18px;border:0;border-radius:6px;background:#da291c;color:#fff;font:inherit;font-weight:600;cursor:pointer}
a{color:#da291c}
</style></head><body><main><h1>${esc(title)}</h1>${body}</main></body></html>`;
}

function readToken(t) {
  try {
    return jwt.verify(String(t || ''), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

publicRoutes.get('/moderate', async (req, res) => {
  const p = readToken(req.query.t);
  if (!p) return res.status(400).send(page('Link expired', '<p>Open the message in admin instead.</p>'));
  const { rows } = await pool.query('SELECT name, relation, message, status FROM condolences WHERE id = $1', [p.c]);
  const c = rows[0];
  if (!c) return res.status(404).send(page('Not found', '<p>This message no longer exists.</p>'));
  const verb = p.a === 'approved' ? 'Approve' : 'Reject';
  res.send(page(`${verb} this message?`, `
    <p>${esc(c.name)} · ${esc(c.relation)} · currently <strong>${esc(c.status)}</strong></p>
    <blockquote>${esc(c.message)}</blockquote>
    <form method="post"><input type="hidden" name="t" value="${esc(req.query.t)}"><button>${verb}</button></form>`));
});

publicRoutes.post('/moderate', express.urlencoded({ extended: false }), async (req, res) => {
  const p = readToken(req.body?.t);
  if (!p) return res.status(400).send(page('Link expired', '<p>Open the message in admin instead.</p>'));
  const status = p.a === 'approved' ? 'approved' : 'rejected';
  const { rows } = await pool.query(
    'UPDATE condolences SET status = $2, reviewed_at = now() WHERE id = $1 RETURNING name',
    [p.c, status]
  );
  if (!rows[0]) return res.status(404).send(page('Not found', '<p>This message no longer exists.</p>'));
  const name = rows[0].name;
  await notify('condolence', `${status === 'approved' ? 'Approved' : 'Rejected'} message from ${name}`, `condolences/${p.c}`);
  res.send(
    status === 'approved'
      ? page('Approved', `<p>${esc(name)}'s message is now on the Campfire.</p><p><a href="${SITE}/campfire/">See it</a></p>`)
      : page('Rejected', '<p>The message will not be shown.</p>')
  );
});

publicRoutes.get('/candles', async (_req, res) => {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM candles');
  res.set('Cache-Control', 'no-store');
  res.json({ count: rows[0].n });
});

publicRoutes.post('/candles', limit(10, HOUR), async (req, res) => {
  const h = ipHash(req.ip);
  const recent = await pool.query(
    `SELECT 1 FROM candles WHERE ip_hash = $1 AND created_at > now() - interval '12 hours'`,
    [h]
  );
  if (!recent.rowCount) await pool.query('INSERT INTO candles (ip_hash) VALUES ($1)', [h]);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM candles');
  res.json({ count: rows[0].n });
});
