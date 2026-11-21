// src/scripts/candle.ts
const KEY = 'tedy-candle-lit';
const WINDOW = 12 * 60 * 60 * 1000;

function isLit() {
  try {
    return Number(localStorage.getItem(KEY) || 0) > Date.now() - WINDOW;
  } catch {
    return false;
  }
}

function markLit() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    return;
  }
}

export function initCandles(root: ParentNode, onCount?: (count: number) => void): () => void {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-candle-btn]')];
  const counts = [...root.querySelectorAll<HTMLElement>('[data-candle-count]')];
  const wraps = [...root.querySelectorAll<HTMLElement>('[data-candle]')];
  let alive = true;

  function render(count: number | null, lit: boolean) {
    if (count !== null) {
      counts.forEach((c) => (c.textContent = count.toLocaleString()));
      onCount?.(count);
    }
    wraps.forEach((w) => w.classList.toggle('is-lit', lit));
    buttons.forEach((b) => {
      b.disabled = lit;
      b.textContent = lit ? 'You lit a candle' : 'Light a candle';
    });
  }

  render(null, isLit());
  fetch('/api/public/candles')
    .then((r) => r.json())
    .then((d) => alive && render(d.count, isLit()))
    .catch(() => {});

  const onClick = async (e: Event) => {
    const b = e.currentTarget as HTMLButtonElement;
    b.disabled = true;
    b.textContent = 'Lighting';
    try {
      const r = await fetch('/api/public/candles', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error('failed');
      markLit();
      if (alive) render(d.count, true);
    } catch {
      if (alive) render(null, isLit());
    }
  };

  buttons.forEach((b) => b.addEventListener('click', onClick));
  return () => {
    alive = false;
    buttons.forEach((b) => b.removeEventListener('click', onClick));
  };
}
