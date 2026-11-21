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

const lightText = () =>
  matchMedia('(pointer: fine)').matches ? 'Click to light a candle for Tedy' : 'Tap to light a candle for Tedy';

function setLabel(b: HTMLButtonElement, text: string) {
  const label = b.querySelector<HTMLElement>('[data-candle-label]') || b;
  label.textContent = text;
}

export function initCandles(root: ParentNode, onCount?: (count: number) => void): () => void {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-candle-btn]')];
  const counts = [...root.querySelectorAll<HTMLElement>('[data-candle-count]')];
  const wraps = [...root.querySelectorAll<HTMLElement>('[data-candle]')];
  let alive = true;
  let shown: number | null = null;
  const timers: number[] = [];

  function render(count: number | null, lit: boolean) {
    if (count !== null) {
      const bump = shown !== null && count !== shown;
      shown = count;
      counts.forEach((c) => {
        c.textContent = count.toLocaleString();
        if (bump) {
          c.classList.remove('is-bump');
          void c.offsetWidth;
          c.classList.add('is-bump');
        }
      });
      onCount?.(count);
    }
    wraps.forEach((w) => w.classList.toggle('is-lit', lit));
    buttons.forEach((b) => {
      b.disabled = lit;
      setLabel(b, lit ? 'Your candle is burning' : b.dataset.label || lightText());
    });
  }

  render(null, isLit());
  fetch('/api/public/candles')
    .then((r) => r.json())
    .then((d) => alive && render(d.count, isLit()))
    .catch(() => {});

  const onClick = async (e: Event) => {
    const b = e.currentTarget as HTMLButtonElement;
    const wrap = b.closest<HTMLElement>('[data-candle]') || b;
    b.disabled = true;
    setLabel(b, 'Lighting');
    try {
      const r = await fetch('/api/public/candles', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error('failed');
      markLit();
      if (!alive) return;
      render(d.count, true);
      wrap.classList.add('is-sparking');
      timers.push(window.setTimeout(() => wrap.classList.remove('is-sparking'), 1600));
    } catch {
      if (alive) render(null, isLit());
    }
  };

  buttons.forEach((b) => b.addEventListener('click', onClick));
  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    buttons.forEach((b) => b.removeEventListener('click', onClick));
  };
}
