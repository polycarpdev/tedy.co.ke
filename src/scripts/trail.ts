// src/scripts/trail.ts
import { paintSky, resetSky } from './sky';

type Stop = { year: number; outfit: string; accessory: string };

const WALK = 1;
const DWELL = 0.7;
const PHRASES = ['Yooo', 'We mzee', 'Niaje bro'];

export function initTrail(root: HTMLElement): () => void {
  const stops: Stop[] = JSON.parse(root.dataset.stops || '[]');
  const n = stops.length;
  const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const qa = <T extends Element>(s: string) => [...root.querySelectorAll<T>(s)];

  const stage = q<HTMLElement>('[data-stage]');
  const world = q<HTMLElement>('[data-world]');
  const clouds = q<HTMLElement>('[data-clouds]');
  const hero = q<HTMLElement>('[data-hero]');
  const wrap = q<HTMLElement>('[data-tedy-wrap]');
  const tedy = q<SVGSVGElement>('[data-tedy]');
  const bubble = q<HTMLElement>('[data-bubble]');
  const btn = q<HTMLElement>('[data-tedy-btn]');
  const yearEl = q<HTMLElement>('[data-year]');
  const fill = q<HTMLElement>('[data-fill]');
  const posts = qa<HTMLElement>('[data-post]');
  const ridges = qa<HTMLElement>('[data-ridge]');
  const chapters = qa<HTMLElement>('[data-chapter]');
  const dots = qa<HTMLButtonElement>('[data-jump]');

  const unit = WALK + DWELL;
  const total = n * unit;
  let stageW = 0;
  let spacing = 0;
  let charX = 0;
  let charH = 0;
  let top = 0;
  let scrollLen = 0;
  let current = 0;
  let raf = 0;
  let lastMove = 0;
  let active = -2;
  let outfitIndex = -1;
  let stepDur = 0;
  let shownYear = -1;
  let bubbleTimer = 0;
  let greetTimer = 0;

  resetSky();

  function layout() {
    stageW = stage.clientWidth;
    spacing = Math.max(stageW * 0.8, 320);
    charX = stageW * (stageW < 768 ? 0.26 : 0.3);
    charH = wrap.offsetHeight;
    wrap.style.left = `${charX}px`;
    posts.forEach((p, i) => {
      p.style.left = `${(i + 1) * spacing + stageW * 0.16}px`;
    });
    top = root.getBoundingClientRect().top + window.scrollY;
    scrollLen = root.offsetHeight - window.innerHeight;
  }

  function progress() {
    if (scrollLen <= 0) return 0;
    return Math.min(Math.max((window.scrollY - top) / scrollLen, 0), 1);
  }

  function sample(p: number) {
    const u = p * total;
    const i = Math.min(Math.floor(u / unit), n - 1);
    const local = u - i * unit;
    const to = (i + 1) * spacing;
    if (local < WALK) {
      const t = local / WALK;
      const prevYear = stops[Math.max(i - 1, 0)].year;
      return {
        x: i * spacing + spacing * t,
        stop: -1,
        toward: i,
        t,
        u,
        year: prevYear + (stops[i].year - prevYear) * t,
      };
    }
    return { x: to, stop: i, toward: i, t: 1, u, year: stops[i].year };
  }

  function scrollToStop(i: number) {
    const u = i * unit + WALK + DWELL * 0.25;
    window.scrollTo({ top: top + (u / total) * scrollLen, behavior: 'smooth' });
  }

  function say(text: string, ms = 2200) {
    bubble.textContent = text;
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => bubble.classList.remove('is-on'), ms);
  }

  function setOutfit(i: number) {
    if (i === outfitIndex) return;
    const first = outfitIndex === -1;
    outfitIndex = i;
    tedy.dataset.outfit = stops[i].outfit;
    tedy.dataset.acc = stops[i].accessory;
    if (first) return;
    tedy.classList.remove('is-swapping');
    void tedy.getBoundingClientRect();
    tedy.classList.add('is-swapping');
  }

  function setActive(i: number) {
    if (i === active) return;
    active = i;
    chapters.forEach((c, k) => c.classList.toggle('is-active', k === i));
    posts.forEach((p, k) => p.classList.toggle('is-active', k === i));
  }

  function frame(now: number) {
    const s = sample(progress());
    const prev = current;
    current += (s.x - current) * 0.16;
    if (Math.abs(s.x - current) < 0.5) current = s.x;
    const dx = current - prev;
    const speed = Math.abs(dx);
    const pos = current / spacing - 1;
    const f = Math.min(Math.max(pos / (n - 1), 0), 1);

    world.style.transform = `translate3d(${charX - current}px, 0, 0)`;
    clouds.style.transform = `translate3d(${-current * 0.05}px, 0, 0)`;
    ridges.forEach((r) => {
      const v = `${-current * Number(r.dataset.ridge)}px 0`;
      r.style.setProperty('-webkit-mask-position', v);
      r.style.setProperty('mask-position', v);
    });
    paintSky(stage, f);

    if (speed > 0.25) {
      lastMove = now;
      const dur = Math.min(Math.max((charH * 0.6) / (speed * 60), 0.25), 1.1);
      if (!stepDur || Math.abs(dur - stepDur) / stepDur > 0.12) {
        stepDur = dur;
        tedy.style.setProperty('--step', `${dur}s`);
      }
      tedy.classList.add('is-walking');
      tedy.classList.remove('is-idle', 'is-pointing', 'is-sitting');
      tedy.classList.toggle('is-left', dx < 0);
    } else if (now - lastMove > 140) {
      const atStop = s.stop >= 0 && current === s.x;
      const last = s.stop === n - 1;
      tedy.classList.remove('is-walking');
      tedy.classList.toggle('is-sitting', atStop && last);
      tedy.classList.toggle('is-pointing', atStop && !last);
      tedy.classList.toggle('is-idle', !atStop);
      if (atStop) tedy.classList.remove('is-left');
    }

    const outfitStop = s.stop >= 0 ? s.stop : s.t > 0.5 ? s.toward : Math.max(s.toward - 1, 0);
    setOutfit(outfitStop);
    setActive(s.stop);

    const year = Math.round(s.year);
    if (year !== shownYear) {
      shownYear = year;
      yearEl.textContent = String(year);
    }

    hero.style.opacity = String(Math.max(0, 1 - s.u / 0.4));
    fill.style.width = `${f * 100}%`;
    dots.forEach((d, k) => d.classList.toggle('is-passed', k <= pos + 0.001));

    raf = requestAnimationFrame(frame);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    const pos = current / spacing - 1;
    const next = e.key === 'ArrowRight'
      ? Math.min(n - 1, Math.floor(pos + 0.001) + 1)
      : Math.max(0, Math.ceil(pos - 0.001) - 1);
    scrollToStop(next);
  };

  const onTap = () => say(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
  const onDot = (e: Event) => scrollToStop(Number((e.currentTarget as HTMLElement).dataset.jump));

  layout();
  root.dataset.ready = '';
  window.addEventListener('resize', layout);
  window.addEventListener('keydown', onKey);
  btn.addEventListener('click', onTap);
  dots.forEach((d) => d.addEventListener('click', onDot));
  raf = requestAnimationFrame(frame);
  if (progress() < 0.02) greetTimer = window.setTimeout(() => say('Niaje bro', 2600), 900);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(bubbleTimer);
    clearTimeout(greetTimer);
    window.removeEventListener('resize', layout);
    window.removeEventListener('keydown', onKey);
    btn.removeEventListener('click', onTap);
    dots.forEach((d) => d.removeEventListener('click', onDot));
  };
}
