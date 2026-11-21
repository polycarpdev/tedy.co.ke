// api/src/routes/hooks.mjs
import { Router } from 'express';
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { pool } from '../db.mjs';
import { notify } from '../notify.mjs';
import { limit } from '../limit.mjs';

export const hooks = Router();

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

hooks.post('/deploy', limit(30, 60 * 60 * 1000), async (req, res) => {
  const secret = process.env.DEPLOY_HOOK_SECRET;
  if (!secret || !safeEqual(req.get('x-deploy-secret') || '', secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.body?.status === 'failed') {
    await pool.query(`UPDATE builds SET status = 'failed', finished_at = now() WHERE status IN ('queued', 'deploying')`);
    await notify('publish', 'Publish failed. Check GitHub Actions', 'overview');
    return res.json({ ok: true });
  }

  await pool.query(`UPDATE builds SET status = 'deploying' WHERE status = 'queued'`);
  const home = os.homedir();
  const log = openSync(path.join(home, 'tedy-deploy.log'), 'a');
  const child = spawn('bash', [path.join(home, 'tedy-deploy', 'deploy.sh')], {
    detached: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, HOME: home },
  });
  child.unref();
  res.status(202).json({ ok: true });
});
