// api/src/limit.mjs
const hits = new Map();

export function limit(max, windowMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
