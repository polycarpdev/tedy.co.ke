// api/src/server.mjs
import './env.mjs';
import express from 'express';
import { pool } from './db.mjs';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

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

app.use('/api', router);
app.use('/', router);
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`tedy-api listening on ${port}`));
