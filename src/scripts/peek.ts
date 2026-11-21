// src/scripts/peek.ts
let timer = 0;
let anim: Animation | null = null;
let last = performance.now();

const hush = () => {
  last = performance.now();
  anim?.cancel();
  anim = null;
  document.querySelectorAll('.slide.is-peeking').forEach((el) => el.classList.remove('is-peeking', 'is-active'));
};

const EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'] as const;

function tick() {
  const trail = document.querySelector<HTMLElement>('.trail');
  const slides = trail?.querySelectorAll<HTMLElement>('.slide');
  if (!trail || !slides || slides.length < 2) return;
  const atStart = slides[0].classList.contains('is-active') && trail.dataset.at === 'start';
  if (!atStart || anim || document.hidden || performance.now() - last < 1500) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  slides[1].classList.add('is-peeking', 'is-active');
  const d = Math.round(Math.min(innerWidth * 0.2, 300));
  anim = slides[1].animate(
    [
      { translate: '0 0' },
      { translate: `${-d}px 0`, offset: 0.4 },
      { translate: `${-d}px 0`, offset: 0.6 },
      { translate: '0 0' },
    ],
    { duration: 3200, easing: 'cubic-bezier(.45,0,.25,1)' }
  );
  anim.onfinish = () => {
    slides[1].classList.remove('is-peeking', 'is-active');
    anim = null;
    last = performance.now() - 500;
  };
}

function start() {
  stop();
  if (!document.querySelector('.trail')) return;
  last = performance.now();
  EVENTS.forEach((e) => addEventListener(e, hush, { passive: true }));
  timer = window.setInterval(tick, 250);
}

function stop() {
  clearInterval(timer);
  EVENTS.forEach((e) => removeEventListener(e, hush));
  hush();
}

document.addEventListener('astro:page-load', start);
document.addEventListener('astro:before-swap', stop);
