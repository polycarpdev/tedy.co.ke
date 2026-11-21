// src/components/campfire/Candle.tsx
import { useEffect, useState } from 'react';

const KEY = 'tedy-candle-lit';
const WINDOW = 12 * 60 * 60 * 1000;

export default function Candle() {
  const [count, setCount] = useState<number | null>(null);
  const [lit, setLit] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setLit(Number(localStorage.getItem(KEY) || 0) > Date.now() - WINDOW);
    } catch {
      setLit(false);
    }
    fetch('/api/public/candles')
      .then((r) => r.json())
      .then((d) => setCount(d.count))
      .catch(() => {});
  }, []);

  async function light() {
    setBusy(true);
    try {
      const r = await fetch('/api/public/candles', { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        setCount(d.count);
        setLit(true);
        try {
          localStorage.setItem(KEY, String(Date.now()));
        } catch {
          /* storage unavailable */
        }
      }
    } catch {
      setBusy(false);
      return;
    }
    setBusy(false);
  }

  return (
    <div className={`cf-card candle${lit ? ' is-lit' : ''}`}>
      <div className="candle-art" aria-hidden="true">
        <span className="candle-flame" />
        <span className="candle-wick" />
        <span className="candle-body" />
      </div>
      <div>
        <p className="candle-count">{count === null ? '–' : count.toLocaleString()}</p>
        <p className="candle-label">{count === 1 ? 'candle lit for Tedy' : 'candles lit for Tedy'}</p>
        <button className="cf-btn" onClick={light} disabled={busy || lit}>
          {lit ? 'You lit a candle' : busy ? 'Lighting' : 'Light a candle'}
        </button>
      </div>
    </div>
  );
}
