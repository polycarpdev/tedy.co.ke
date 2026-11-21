// src/scripts/trail.ts
import { paintSky, resetSky } from './sky';
import { initCandles } from './candle';

type Stop = { slug: string; year: string; outfit: string; accessory: string };

const WALK = 1;
const DWELL = 0.8;
const UNIT = WALK + DWELL;
const PHRASES = ['Yooo', 'We mzee', 'Niaje bro'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const pad = (i: number) => String(i).padStart(2, '0');

export function initTrail(root: HTMLElement): () => void {
  const stops: Stop[] = JSON.parse(root.dataset.stops || '[]');
  const n = stops.length;
  const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const qa = <T extends Element>(s: string) => [...root.querySelectorAll<T>(s)];

  const stage = q<HTMLElement>('[data-stage]');
  const world = q<HTMLElement>('[data-world]');
  const clouds = q<HTMLElement>('[data-clouds]');
  const sky = q<SVGSVGElement>('[data-sky]');
  const tedy = q<SVGSVGElement>('[data-tedy]');
  const tedyWrap = q<HTMLElement>('[data-tedy-wrap]');
  const tedyBtn = q<HTMLElement>('[data-tedy-btn]');
  const bubble = q<HTMLElement>('[data-bubble]');
  const yearEl = q<HTMLElement>('[data-year]');
  const countEl = q<HTMLElement>('[data-count]');
  const sheet = q<HTMLDialogElement>('[data-sheet]');
  const sheetBody = q<HTMLElement>('[data-sheet-body]');
  const slides = qa<HTMLElement>('[data-slide]');
  const ridges = qa<HTMLElement>('[data-ridge]');
  const dots = qa<HTMLElement>('[data-jump]');
  const chapters = qa<HTMLTemplateElement>('template[data-chapter]');

  const total = n * UNIT;
  let W = 0;
  let charH = 0;
  let top = 0;
  let scrollLen = 0;
  let current = 0;
  let raf = 0;
  let lastMove = 0;
  let activeSlide = -1;
  let outfitIndex = -1;
  let shownIndex = -1;
  let stepDur = 0;
  let bubbleTimer = 0;
  let greetTimer = 0;
  let openSlug: string | null = null;
  let pushedHash = false;
  let touchX = 0;
  let touchY = 0;
  const candleStars: SVGCircleElement[] = [];

  resetSky();

  function layout() {
    W = stage.clientWidth;
    charH = tedyWrap.offsetHeight;
    slides.forEach((s, i) => {
      s.style.left = `${i * W}px`;
      s.style.width = `${W}px`;
    });
    top = root.getBoundingClientRect().top + window.scrollY;
    scrollLen = root.offsetHeight - window.innerHeight;
  }

  const progress = () => (scrollLen > 0 ? clamp((window.scrollY - top) / scrollLen, 0, 1) : 0);

  function target(p: number) {
    const u = p * total;
    const i = Math.min(Math.floor(u / UNIT), n - 1);
    const local = u - i * UNIT;
    if (local < WALK) return { x: (i + local / WALK) * W, stop: -1 };
    return { x: (i + 1) * W, stop: i };
  }

  function scrollToStop(i: number, behavior: ScrollBehavior = 'smooth') {
    if (i < 0) {
      window.scrollTo({ top, behavior });
      return;
    }
    const u = i * UNIT + WALK + DWELL * 0.3;
    window.scrollTo({ top: top + (u / total) * scrollLen, behavior });
  }

  function say(text: string, ms = 2200) {
    bubble.textContent = text;
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => bubble.classList.remove('is-on'), ms);
  }

  function setOutfit(i: number) {
    if (i === outfitIndex || !stops[i]) return;
    const first = outfitIndex === -1;
    outfitIndex = i;
    tedy.dataset.outfit = stops[i].outfit;
    tedy.dataset.acc = stops[i].accessory;
    if (first) return;
    tedy.classList.remove('is-swapping');
    void tedy.getBoundingClientRect();
    tedy.classList.add('is-swapping');
  }

  function renderStars(count: number) {
    const want = Math.min(count, 300);
    for (let k = candleStars.length; k < want; k++) {
      let s = ((k + 1) * 9301) % 233280;
      const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', `${(r() * 100).toFixed(2)}%`);
      c.setAttribute('cy', `${(r() * 56).toFixed(2)}%`);
      c.setAttribute('r', (r() * 0.9 + 0.7).toFixed(2));
      c.setAttribute('class', 'candle-star');
      c.style.animationDelay = `-${(r() * 4).toFixed(2)}s`;
      sky.appendChild(c);
      candleStars.push(c);
    }
  }

  function openChapter(slug: string, fromHash = false) {
    const tpl = chapters.find((c) => c.dataset.chapter === slug);
    if (!tpl) return;
    sheetBody.replaceChildren(tpl.content.cloneNode(true));
    sheet.scrollTop = 0;
    if (!sheet.open) sheet.showModal();
    document.documentElement.classList.add('is-paused');
    openSlug = slug;
    if (!fromHash) {
      pushedHash = true;
      location.hash = `stop/${slug}`;
    }
  }

  function closeChapter(fromHash = false) {
    if (!openSlug) return;
    openSlug = null;
    if (sheet.open) sheet.close();
    document.documentElement.classList.remove('is-paused');
    sheetBody.replaceChildren();
    if (fromHash) return;
    if (pushedHash) {
      pushedHash = false;
      history.back();
    } else if (location.hash) {
      history.replaceState(history.state, '', location.pathname + location.search);
    }
  }

  function frame(now: number) {
    const t = target(progress());
    const prev = current;
    current += (t.x - current) * 0.14;
    if (Math.abs(t.x - current) < 0.5) current = t.x;
    const dx = current - prev;
    const pos = W ? current / W - 1 : -1;
    const f = clamp(pos / Math.max(n - 1, 1), 0, 1);

    world.style.transform = `translate3d(${-current}px, 0, 0)`;
    clouds.style.transform = `translate3d(${-current * 0.04}px, 0, 0)`;
    ridges.forEach((r) => {
      const v = `${-current * Number(r.dataset.ridge)}px 0`;
      r.style.setProperty('-webkit-mask-position', v);
      r.style.setProperty('mask-position', v);
    });
    paintSky(stage, f);

    if (Math.abs(dx) > 0.3) {
      lastMove = now;
      const dur = clamp((charH * 2.4) / (Math.abs(dx) * 60), 0.28, 1);
      if (!stepDur || Math.abs(dur - stepDur) / stepDur > 0.15) {
        stepDur = dur;
        tedy.style.setProperty('--step', `${dur}s`);
      }
      tedy.classList.add('is-walking');
      tedy.classList.remove('is-idle', 'is-pointing', 'is-sitting');
      tedy.classList.toggle('is-left', dx < 0);
    } else if (now - lastMove > 140) {
      const atStop = t.stop >= 0 && current === t.x;
      const atEnd = t.stop === n - 1;
      tedy.classList.remove('is-walking');
      tedy.classList.toggle('is-sitting', atStop && atEnd);
      tedy.classList.toggle('is-pointing', atStop && !atEnd);
      tedy.classList.toggle('is-idle', !atStop);
      if (atStop) tedy.classList.remove('is-left');
    }

    const nearest = clamp(Math.round(pos), 0, n - 1);
    setOutfit(nearest);

    const slide = clamp(Math.round(current / (W || 1)), 0, slides.length - 1);
    if (slide !== activeSlide) {
      activeSlide = slide;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === slide));
    }

    if (nearest !== shownIndex && stops[nearest]) {
      shownIndex = nearest;
      yearEl.textContent = stops[nearest].year;
      countEl.textContent = `${pad(nearest + 1)} / ${pad(n)}`;
    }
    dots.forEach((d, k) => {
      d.classList.toggle('is-passed', k <= pos + 0.001);
      d.classList.toggle('is-current', k === nearest && pos > -0.5);
    });

    raf = requestAnimationFrame(frame);
  }

  function step(dir: 1 | -1) {
    const pos = W ? current / W - 1 : -1;
    const next = dir > 0 ? Math.floor(pos + 0.001) + 1 : Math.ceil(pos - 0.001) - 1;
    scrollToStop(clamp(next, -1, n - 1));
  }

  const onClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-open],[data-resume],[data-begin],[data-jump]');
    if (!el) return;
    if (el.dataset.open) {
      e.preventDefault();
      openChapter(el.dataset.open);
    } else if (el.hasAttribute('data-resume')) {
      e.preventDefault();
      closeChapter();
    } else if (el.hasAttribute('data-begin')) {
      scrollToStop(0);
    } else if (el.dataset.jump !== undefined) {
      scrollToStop(Number(el.dataset.jump));
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (openSlug || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    step(e.key === 'ArrowRight' ? 1 : -1);
  };

  const onTouchStart = (e: TouchEvent) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (openSlug) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    step(dx < 0 ? 1 : -1);
  };

  const onHash = () => {
    const m = location.hash.match(/^#stop\/([\w-]+)$/);
    if (m) {
      if (openSlug !== m[1]) openChapter(m[1], true);
    } else {
      pushedHash = false;
      closeChapter(true);
    }
  };

  const onCancel = (e: Event) => {
    e.preventDefault();
    closeChapter();
  };

  const onBackdrop = (e: MouseEvent) => {
    if (e.target === sheet) closeChapter();
  };

  const onCarousel = (e: Event) => {
    const el = e.target as HTMLElement;
    if (!el.matches?.('[data-carousel]')) return;
    const counter = el.parentElement?.querySelector('[data-counter]');
    if (counter) {
      counter.textContent = `${Math.round(el.scrollLeft / (el.clientWidth || 1)) + 1} / ${el.children.length}`;
    }
  };

  const onTap = () => say(PHRASES[Math.floor(Math.random() * PHRASES.length)]);

  layout();
  root.dataset.ready = '';
  const stopCandles = initCandles(root, renderStars);
  window.addEventListener('resize', layout);
  window.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);
  root.addEventListener('click', onClick);
  stage.addEventListener('touchstart', onTouchStart, { passive: true });
  stage.addEventListener('touchend', onTouchEnd, { passive: true });
  sheet.addEventListener('cancel', onCancel);
  sheet.addEventListener('click', onBackdrop);
  sheet.addEventListener('scroll', onCarousel, true);
  tedyBtn.addEventListener('click', onTap);
  raf = requestAnimationFrame(frame);

  const deep = location.hash.match(/^#stop\/([\w-]+)$/);
  const deepIndex = deep ? stops.findIndex((s) => s.slug === deep[1]) : -1;
  if (deep && deepIndex >= 0) {
    scrollToStop(deepIndex, 'instant' as ScrollBehavior);
    openChapter(deep[1], true);
  } else if (progress() < 0.02) {
    greetTimer = window.setTimeout(() => say('Niaje bro', 2600), 1200);
  }

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(bubbleTimer);
    clearTimeout(greetTimer);
    stopCandles();
    closeChapter(true);
    window.removeEventListener('resize', layout);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onHash);
    root.removeEventListener('click', onClick);
    stage.removeEventListener('touchstart', onTouchStart);
    stage.removeEventListener('touchend', onTouchEnd);
    sheet.removeEventListener('cancel', onCancel);
    sheet.removeEventListener('click', onBackdrop);
    sheet.removeEventListener('scroll', onCarousel, true);
    tedyBtn.removeEventListener('click', onTap);
  };
}
