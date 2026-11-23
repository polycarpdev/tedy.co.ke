// src/scripts/stream.ts
import '../styles/stream.css';

type Msg = { id: number; name: string; relation: string; message: string };

const TICK = 3200;
const MAX = 8;
const REFRESH = 90000;

export function initStream(el: HTMLElement): () => void {
  const list = el.querySelector<HTMLElement>('[data-stream-list]')!;
  const countEl = el.querySelector<HTMLElement>('[data-stream-count]');
  const seen = new Set<number>();
  const fresh: Msg[] = [];
  let items: Msg[] = [];
  let i = 0;
  let hover = false;
  let alive = true;
  let loaded = false;
  let loading = false;

  const visible = () => !el.closest('.slide') || !!el.closest('.slide.is-active');
  const paused = () => hover || !!list.querySelector('.is-open');

  async function load() {
    loading = true;
    try {
      const r = await fetch('/api/public/stream');
      const d = await r.json();
      if (alive) {
        const next: Msg[] = d.items || [];
        if (loaded) next.forEach((m) => !seen.has(m.id) && fresh.push(m));
        next.forEach((m) => seen.add(m.id));
        items = next;
        loaded = true;
        if (countEl) countEl.textContent = String(d.total ?? items.length);
        el.classList.toggle('is-empty', items.length === 0);
      }
    } catch {
      el.classList.toggle('is-empty', items.length === 0);
    }
    loading = false;
  }

  function show() {
    if (!items.length) return;
    const shown = new Set([...list.children].map((c) => Number((c as HTMLElement).dataset.id)));
    let m = fresh.shift();
    for (let k = 0; !m && k < items.length; k++) {
      const c = items[i++ % items.length];
      if (!shown.has(c.id)) m = c;
    }
    if (!m) return;
    const li = document.createElement('li');
    li.className = 'st-item';
    li.dataset.id = String(m.id);
    const inner = document.createElement('div');
    inner.className = 'st-inner';
    const who = document.createElement('p');
    who.className = 'st-who';
    const b = document.createElement('b');
    b.textContent = m.name;
    const s = document.createElement('span');
    s.textContent = m.relation;
    who.append(b, s);
    const p = document.createElement('p');
    p.className = 'st-text';
    p.textContent = m.message;
    inner.append(who, p);
    li.append(inner);
    list.append(li);
    while (list.children.length > MAX) list.firstElementChild?.remove();
    window.setTimeout(() => list.classList.toggle('is-full', list.scrollHeight > list.clientHeight + 1), 800);
  }

  const prime = () => {
    for (let k = 0; k < Math.min(3, items.length); k++) show();
  };

  const tick = window.setInterval(async () => {
    if (document.hidden || !visible()) return;
    if (!loaded) {
      if (loading) return;
      await load();
      prime();
      return;
    }
    if (!paused()) show();
  }, TICK);

  const refresh = window.setInterval(() => {
    if (loaded && !document.hidden && visible()) load();
  }, REFRESH);

  const onClick = (e: Event) => {
    const item = (e.target as HTMLElement).closest('.st-item');
    if (item) item.classList.toggle('is-open');
  };
  const onEnter = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') hover = true;
  };
  const onLeave = () => {
    hover = false;
  };

  list.addEventListener('click', onClick);
  list.addEventListener('pointerenter', onEnter);
  list.addEventListener('pointerleave', onLeave);
  if (visible()) load().then(prime);

  return () => {
    alive = false;
    clearInterval(tick);
    clearInterval(refresh);
    list.removeEventListener('click', onClick);
    list.removeEventListener('pointerenter', onEnter);
    list.removeEventListener('pointerleave', onLeave);
  };
}
