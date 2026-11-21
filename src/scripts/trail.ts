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
  let charW = 0;
  let charL = 0;
  let charR = 0;
  let tx = 0;
  let seatX = 0;
  let lastFrame = 0;
  let lastLinked = Number.NaN;
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
  let moved = false;
  let atState = '';
  let lastInteract = performance.now();
  const teaseStart = performance.now() + 2200;
  const candleStars: SVGCircleElement[] = [];

  resetSky();

  function layout() {
    W = stage.clientWidth;
    charH = tedyWrap.offsetHeight;
    charW = tedyWrap.offsetWidth;
    charL = parseFloat(getComputedStyle(tedyWrap).left) || 0;
    charR = parseFloat(getComputedStyle(document.documentElement).fontSize) * (W >= 1024 ? 4.5 : 2.75);
    const seatW = charW * 0.4;
    const fireH = charH * 0.5;
    const campGap = charW * 0.6;
    stage.style.setProperty('--camp-r', `${charR}px`);
    stage.style.setProperty('--seat-w', `${seatW}px`);
    stage.style.setProperty('--seat-h', `${charH * 0.27}px`);
    stage.style.setProperty('--fire-h', `${fireH}px`);
    stage.style.setProperty('--camp-gap', `${campGap}px`);
    seatX = Math.max(0, W - charR - fireH * 0.9 - campGap - seatW / 2 - charW * 0.5 - charL);
    slides.forEach((s, i) => {
      s.style.left = `${i * W}px`;
      s.style.width = `${W}px`;
    });
    top = root.getBoundingClientRect().top + window.scrollY;
    scrollLen = root.offsetHeight - window.innerHeight;
    fitPrints();
  }

  function fitPrints() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const padX = rem * 0.9;
    const padY = rem * 1.95;
    root.querySelectorAll<HTMLElement>('[data-print]').forEach((print) => {
      const box = print.parentElement as HTMLElement;
      const ar = Number(box.dataset.ar) || 0.8;
      const maxW = Math.max(0, box.clientWidth - padX);
      const maxH = Math.max(0, box.clientHeight - padY);
      let w = maxW;
      let h = w / ar;
      if (h > maxH) {
        h = maxH;
        w = h * ar;
      }
      print.style.width = `${Math.round(w + padX)}px`;
      print.style.height = `${Math.round(h + padY)}px`;
    });
  }

  const progress = () => (scrollLen > 0 ? clamp((window.scrollY - top) / scrollLen, 0, 1) : 0);

  function target(p: number) {
    const u = p * total;
    const i = Math.min(Math.floor(u / UNIT), n - 1);
    const local = u - i * UNIT;
    if (local < WALK) return { x: (i + local / WALK) * W, stop: -1 };
    return { x: (i + 1) * W, stop: i };
  }

  function markMoved() {
    if (moved) return;
    moved = true;
    root.dataset.moved = '';
  }

  function scrollToStop(i: number, behavior: ScrollBehavior = 'smooth') {
    markMoved();
    if (i < 0) {
      window.scrollTo({ top, behavior });
      return;
    }
    const u = i * UNIT + WALK + DWELL * 0.3;
    window.scrollTo({ top: top + (u / total) * scrollLen, behavior });
  }

  function step(dir: number) {
    const pos = W ? current / W - 1 : -1;
    const next = dir > 0 ? Math.floor(pos + 0.001) + 1 : Math.ceil(pos - 0.001) - 1;
    scrollToStop(clamp(next, -1, n - 1));
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
    markMoved();
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
    current += (t.x - current) * 0.12;
    if (Math.abs(t.x - current) < 0.5) current = t.x;
    const dx = current - prev;
    const pos = W ? current / W - 1 : -1;
    const f = clamp(pos / Math.max(n - 1, 1), 0, 1);

    if (!moved && progress() > 0.004) markMoved();

    let tease = 0;
    let peek = 0;
    if (atState === 'start' && !openSlug && current < 1 && now - lastInteract > 1500) {
      const k = (now - lastInteract - 1500) % 4500;
      if (k < 2200) peek = Math.sin((k / 2200) * Math.PI) * W * 0.2;
    }
    const view = current + tease;

    world.style.transform = `translate3d(${-view}px, 0, 0)`;
    clouds.style.transform = `translate3d(${-current * 0.04}px, 0, 0)`;
    ridges.forEach((r) => {
      const v = `${-current * Number(r.dataset.ridge)}px 0`;
      r.style.setProperty('-webkit-mask-position', v);
      r.style.setProperty('mask-position', v);
    });
    slides.forEach((s, k) => {
      const d = clamp(k - view / (W || 1), -1.5, 1.5);
      s.style.setProperty('--d', d.toFixed(3));
      s.style.setProperty('--ad', Math.abs(d).toFixed(3));
    });
    paintSky(stage, f);

    const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    const auto = pos > n - 2 + 0.02;
    const linked = clamp((pos + 1) / Math.max(n - 1, 1), 0, 1) * seatX * 0.75;
    const follow = Number.isNaN(lastLinked) ? 0 : Math.abs(linked - lastLinked) * 1.25 + 1;
    lastLinked = linked;
    const desired = auto ? seatX : linked;
    const limit = Math.max(charH * 1.3 * dt, auto ? 0 : follow);
    const stepX = clamp(desired - tx, -limit, limit);
    tx += stepX;
    tedyWrap.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
    const speed = Math.abs(stepX) / (dt || 0.016);

    if (Math.abs(stepX) > 0.15) {
      lastMove = now;
      const dur = clamp((charH * 0.55) / Math.max(speed, 1), 0.3, 1.1);
      if (!stepDur || Math.abs(dur - stepDur) / stepDur > 0.15) {
        stepDur = dur;
        tedy.style.setProperty('--step', `${dur}s`);
      }
      tedy.classList.add('is-walking');
      tedy.classList.remove('is-idle', 'is-pointing', 'is-sitting');
      tedy.classList.toggle('is-left', stepX < 0);
    } else if (now - lastMove > 140) {
      const seated = auto && Math.abs(seatX - tx) < 1;
      const atStop = !auto && t.stop >= 0 && current === t.x;
      tedy.classList.remove('is-walking', 'is-left');
      tedy.classList.toggle('is-sitting', seated);
      tedy.classList.toggle('is-pointing', atStop);
      tedy.classList.toggle('is-idle', !seated && !atStop);
    }

    const nearest = clamp(Math.round(pos), 0, n - 1);
    setOutfit(nearest);

    const slide = clamp(Math.round(current / (W || 1)), 0, slides.length - 1);
    if (slide !== activeSlide) {
      activeSlide = slide;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === slide));
    }

    const at = pos < -0.5 ? 'start' : pos > n - 1.5 ? 'end' : 'mid';
    if (at !== atState) {
      atState = at;
      root.dataset.at = at;
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

  const onClick = (e: MouseEvent) => {
    lastInteract = performance.now();
    const el = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-open],[data-resume],[data-begin],[data-jump],[data-step]'
    );
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
    } else if (el.dataset.step !== undefined) {
      step(Number(el.dataset.step));
    }
  };

  const onKey = (e: KeyboardEvent) => {
    lastInteract = performance.now();
    if (openSlug || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    step(e.key === 'ArrowRight' ? 1 : -1);
  };

  const onTouchStart = (e: TouchEvent) => {
    lastInteract = performance.now();
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (openSlug) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
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

  const onScroll = () => {
    lastInteract = performance.now();
  };

  const onTap = () => say(PHRASES[Math.floor(Math.random() * PHRASES.length)]);

  layout();
  document.fonts?.ready.then(() => layout());
  root.dataset.ready = '';
  const stopCandles = initCandles(root, renderStars);
  window.addEventListener('resize', layout);
  window.addEventListener('scroll', onScroll, { passive: true });
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

  let resumeY = -1;
  try {
    if (sessionStorage.getItem('tedy-resume') === '1') resumeY = Number(sessionStorage.getItem('tedy-trail-y') || -1);
    sessionStorage.removeItem('tedy-resume');
  } catch {
    resumeY = -1;
  }
  if (resumeY > 0 && !location.hash) window.scrollTo(0, resumeY);

  const deep = location.hash.match(/^#stop\/([\w-]+)$/);
  const deepIndex = deep ? stops.findIndex((s) => s.slug === deep[1]) : -1;
  if (deep && deepIndex >= 0) {
    scrollToStop(deepIndex, 'instant' as ScrollBehavior);
    openChapter(deep[1], true);
  } else if (progress() < 0.02) {
    greetTimer = window.setTimeout(() => say('Niaje bro', 2600), 1400);
  } else {
    markMoved();
  }

  return () => {
    try {
      sessionStorage.setItem('tedy-trail-y', String(window.scrollY));
    } catch {
      resumeY = -1;
    }
    cancelAnimationFrame(raf);
    clearTimeout(bubbleTimer);
    clearTimeout(greetTimer);
    stopCandles();
    closeChapter(true);
    window.removeEventListener('resize', layout);
    window.removeEventListener('scroll', onScroll);
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
