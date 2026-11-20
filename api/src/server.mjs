// api/src/server.mjs
import './env.mjs';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool } from './db.mjs';
import { auth } from './routes/auth.mjs';
import { admin } from './routes/admin.mjs';

if (!process.env.JWT_SECRET) console.error('JWT_SECRET is missing from .env');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT now() AS now, (SELECT count(*)::int FROM stops) AS stops'
    );
    res.json({ ok: true, db: true, now: rows[0].now, stops: rows[0].stops });
  } catch (err) {
    res.status(500).json({ ok: false, db: false, error: err.message });
  }
});

router.use('/auth', auth);
router.use('/admin', admin);

app.use('/api', router);
app.use('/', router);
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`tedy-api listening on ${port}`));
