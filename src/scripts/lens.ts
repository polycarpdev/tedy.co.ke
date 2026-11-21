// src/scripts/lens.ts
const pad = (i: number) => String(i).padStart(2, '0');
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const SOUND_KEY = 'tedy-shutter';

export function initLens(root: HTMLElement): () => void {
  const strip = root.querySelector<HTMLElement>('[data-strip]');
  if (!strip) return () => {};
  const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;

  const frames = [...root.querySelectorAll<HTMLElement>('[data-frame]')];
  const tiles = [...root.querySelectorAll<HTMLButtonElement>('[data-cs]')];
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const viewBtn = q<HTMLButtonElement>('[data-view-toggle]');
  const soundBtn = q<HTMLButtonElement>('[data-sound]');
  const riCount = q<HTMLElement>('[data-ri-count]');
  const riMeta = q<HTMLElement>('[data-ri-meta]');
  const riCaption = q<HTMLElement>('[data-ri-caption]');
  const riBy = q<HTMLElement>('[data-ri-by]');
  const vf = q<HTMLDialogElement>('[data-vf]');
  const vfStage = q<HTMLElement>('[data-vf-stage]');
  const vfImg = q<HTMLImageElement>('[data-vf-img]');
  const vfMeta = q<HTMLElement>('[data-vf-meta]');
  const vfCaption = q<HTMLElement>('[data-vf-caption]');
  const vfCount = q<HTMLElement>('[data-vf-count]');

  let visible = frames;
  let current = -1;
  let vfIndex = -1;
  let pushed = false;
  let ticking = false;
  let interacted = false;
  let touchX = 0;
  let touchY = 0;
  let multi = false;
  let audio: AudioContext | null = null;
  let soundOn = true;
  try {
    soundOn = localStorage.getItem(SOUND_KEY) !== '0';
  } catch {
    soundOn = true;
  }

  function unlockAudio() {
    if (!soundOn) return;
    try {
      audio ??= new AudioContext();
      if (audio.state === 'suspended') audio.resume();
    } catch {
      audio = null;
    }
  }

  function shutter() {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const len = Math.floor(audio.sampleRate * 0.035);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = audio.createBufferSource();
    src.buffer = buf;
    const filter = audio.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = audio.createGain();
    gain.gain.value = 0.16;
    src.connect(filter).connect(gain).connect(audio.destination);
    src.start();
  }

  function setSoundUi() {
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  }

  function updateInfo() {
    const f = visible[current];
    if (!f) return;
    riCount.textContent = `${pad(current + 1)} / ${pad(visible.length)}`;
    riMeta.textContent = f.dataset.meta || '';
    riCaption.textContent = f.dataset.caption || '';
    riCaption.hidden = !riCaption.textContent;
    riBy.hidden = f.dataset.by !== '1';
    frames.forEach((x) => x.classList.toggle('is-current', x === f));
  }

  function paint() {
    ticking = false;
    const r = strip!.getBoundingClientRect();
    const mid = r.left + r.width / 2;
    let best = -1;
    let bestDist = Infinity;
    visible.forEach((f, k) => {
      const b = f.getBoundingClientRect();
      const c = b.left + b.width / 2;
      const d = (c - mid) / (r.width || 1);
      f.style.setProperty('--ad', Math.min(1, Math.abs(d) * 1.6).toFixed(3));
      const dist = Math.abs(c - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = k;
      }
    });
    if (best !== current) {
      current = best;
      updateInfo();
      if (interacted) shutter();
    }
  }

  function requestPaint() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(paint);
  }

  function goTo(k: number, behavior: ScrollBehavior = 'smooth') {
    const f = visible[clamp(k, 0, visible.length - 1)];
    if (!f) return;
    strip!.scrollTo({ left: f.offsetLeft + f.offsetWidth / 2 - strip!.clientWidth / 2, behavior });
  }

  function matches(el: HTMLElement, filter: string) {
    return (
      filter === 'all' ||
      (filter === 'by' && el.dataset.by === '1') ||
      (filter === 'of' && el.dataset.by !== '1') ||
      filter === `stop:${el.dataset.stop}`
    );
  }

  function applyFilter(filter: string) {
    frames.forEach((f) => (f.hidden = !matches(f, filter)));
    tiles.forEach((t) => (t.hidden = !matches(t, filter)));
    visible = frames.filter((f) => !f.hidden);
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === filter)));
    current = -1;
    requestAnimationFrame(() => {
      goTo(0, 'instant' as ScrollBehavior);
      paint();
    });
  }

  function setView(view: 'strip' | 'sheet') {
    root.dataset.view = view;
    viewBtn.setAttribute('aria-pressed', String(view === 'sheet'));
    if (view === 'strip') {
      requestAnimationFrame(() => {
        goTo(Math.max(current, 0), 'instant' as ScrollBehavior);
        paint();
      });
    }
  }

  function vfShow(k: number) {
    if (!visible.length) return;
    vfIndex = (k + visible.length) % visible.length;
    const f = visible[vfIndex];
    vf.classList.remove('is-focus');
    void vf.offsetWidth;
    vf.classList.add('is-focus');
    vfImg.srcset = f.dataset.srcset || '';
    vfImg.sizes = '100vw';
    vfImg.src = f.dataset.src || '';
    vfImg.alt = f.dataset.alt || '';
    vfMeta.textContent = f.dataset.meta || '';
    vfCaption.textContent = f.dataset.caption || '';
    vfCaption.hidden = !vfCaption.textContent;
    vf.classList.toggle('is-by', f.dataset.by === '1');
    vfCount.textContent = `${pad(vfIndex + 1)} / ${pad(visible.length)}`;
    shutter();
  }

  function vfOpen(k: number) {
    vf.classList.remove('is-clean');
    vfShow(k);
    if (!vf.open) vf.showModal();
    document.documentElement.classList.add('vf-open');
    pushed = true;
    location.hash = 'photo';
  }

  function vfClose(fromHash = false) {
    if (!vf.open) return;
    vf.close();
    document.documentElement.classList.remove('vf-open');
    goTo(vfIndex, 'instant' as ScrollBehavior);
    if (!fromHash && pushed) {
      pushed = false;
      history.back();
    }
  }

  const zoomed = () => (window.visualViewport?.scale || 1) > 1.05;

  const onPointerDown = () => {
    interacted = true;
    unlockAudio();
  };

  const onClick = (e: MouseEvent) => {
    const el = e.target as HTMLElement;
    const chip = el.closest<HTMLButtonElement>('[data-filter]');
    if (chip) return applyFilter(chip.dataset.filter || 'all');
    if (el.closest('[data-view-toggle]')) return setView(root.dataset.view === 'sheet' ? 'strip' : 'sheet');
    if (el.closest('[data-sound]')) {
      soundOn = !soundOn;
      try {
        localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0');
      } catch {
        soundOn = soundOn;
      }
      setSoundUi();
      unlockAudio();
      shutter();
      return;
    }
    const tile = el.closest<HTMLButtonElement>('[data-cs]');
    if (tile) {
      const k = visible.indexOf(frames[Number(tile.dataset.cs)]);
      setView('strip');
      requestAnimationFrame(() => goTo(k, 'instant' as ScrollBehavior));
      return;
    }
    const shot = el.closest<HTMLElement>('[data-shot]');
    if (shot) {
      const k = visible.indexOf(shot.closest<HTMLElement>('[data-frame]')!);
      return k === current ? vfOpen(k) : goTo(k);
    }
    if (el.closest('[data-prev]')) return goTo(current - 1);
    if (el.closest('[data-next]')) return goTo(current + 1);
    if (el.closest('[data-vf-close]')) return vfClose();
    if (el.closest('[data-vf-prev]')) return vfShow(vfIndex - 1);
    if (el.closest('[data-vf-next]')) return vfShow(vfIndex + 1);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    interacted = true;
    unlockAudio();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    if (vf.open) vfShow(vfIndex + dir);
    else if (root.dataset.view === 'strip') goTo(current + dir);
  };

  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    interacted = true;
    strip!.scrollBy({ left: e.deltaY });
  };

  const onCancel = (e: Event) => {
    e.preventDefault();
    vfClose();
  };

  const onHash = () => {
    if (location.hash !== '#photo' && vf.open) {
      pushed = false;
      vfClose(true);
    }
  };

  const onVfTouchStart = (e: TouchEvent) => {
    multi = e.touches.length > 1;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  };

  const onVfTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 1) multi = true;
  };

  const onVfTouchEnd = (e: TouchEvent) => {
    if (multi || zoomed()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) vfShow(vfIndex + (dx < 0 ? 1 : -1));
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) vf.classList.toggle('is-clean');
  };

  const onVfClick = (e: MouseEvent) => {
    if (e.target === vfImg && matchMedia('(pointer: fine)').matches) vf.classList.toggle('is-clean');
  };

  setSoundUi();
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('click', onClick);
  strip.addEventListener('scroll', requestPaint, { passive: true });
  strip.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', requestPaint);
  window.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);
  vf.addEventListener('cancel', onCancel);
  vfStage.addEventListener('touchstart', onVfTouchStart, { passive: true });
  vfStage.addEventListener('touchmove', onVfTouchMove, { passive: true });
  vfStage.addEventListener('touchend', onVfTouchEnd, { passive: true });
  vfStage.addEventListener('click', onVfClick);
  if (location.hash === '#photo') history.replaceState(history.state, '', location.pathname);
  requestAnimationFrame(() => {
    goTo(0, 'instant' as ScrollBehavior);
    paint();
  });

  return () => {
    vfClose(true);
    audio?.close().catch(() => {});
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('click', onClick);
    strip.removeEventListener('scroll', requestPaint);
    strip.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', requestPaint);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onHash);
    vf.removeEventListener('cancel', onCancel);
    vfStage.removeEventListener('touchstart', onVfTouchStart);
    vfStage.removeEventListener('touchmove', onVfTouchMove);
    vfStage.removeEventListener('touchend', onVfTouchEnd);
    vfStage.removeEventListener('click', onVfClick);
  };
}
