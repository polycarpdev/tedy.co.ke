// src/scripts/lens.ts
const pad = (i: number) => String(i).padStart(2, '0');

export function initLens(root: HTMLElement): () => void {
  const tiles = [...root.querySelectorAll<HTMLButtonElement>('[data-tile]')];
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const vf = root.querySelector<HTMLDialogElement>('[data-vf]')!;
  const stage = root.querySelector<HTMLElement>('[data-vf-stage]')!;
  const img = root.querySelector<HTMLImageElement>('[data-vf-img]')!;
  const meta = root.querySelector<HTMLElement>('[data-vf-meta]')!;
  const caption = root.querySelector<HTMLElement>('[data-vf-caption]')!;
  const count = root.querySelector<HTMLElement>('[data-vf-count]')!;

  let visible = tiles;
  let index = -1;
  let pushed = false;
  let touchX = 0;
  let touchY = 0;
  let multi = false;

  function applyFilter(f: string) {
    tiles.forEach((t) => {
      const show =
        f === 'all' ||
        (f === 'by' && t.dataset.by === '1') ||
        (f === 'of' && t.dataset.by !== '1') ||
        f === `stop:${t.dataset.stop}`;
      t.hidden = !show;
      if (show) {
        t.classList.remove('is-in');
        void t.offsetWidth;
        t.classList.add('is-in');
      }
    });
    visible = tiles.filter((t) => !t.hidden);
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === f)));
  }

  function preload(i: number) {
    const t = visible[(i + visible.length) % visible.length];
    if (!t?.dataset.src) return;
    const p = new Image();
    p.srcset = t.dataset.srcset || '';
    p.sizes = '100vw';
    p.src = t.dataset.src;
  }

  function show(i: number) {
    if (!visible.length) return;
    index = (i + visible.length) % visible.length;
    const t = visible[index];
    vf.classList.remove('is-focus');
    void vf.offsetWidth;
    vf.classList.add('is-focus');
    img.srcset = t.dataset.srcset || '';
    img.sizes = '100vw';
    img.src = t.dataset.src || '';
    img.width = Number(t.dataset.w) || 0;
    img.height = Number(t.dataset.h) || 0;
    img.alt = t.dataset.alt || '';
    meta.textContent = t.dataset.meta || '';
    caption.textContent = t.dataset.caption || '';
    caption.hidden = !caption.textContent;
    vf.classList.toggle('is-by', t.dataset.by === '1');
    count.textContent = `${pad(index + 1)} / ${pad(visible.length)}`;
    preload(index + 1);
    preload(index - 1);
  }

  function open(tile: HTMLButtonElement) {
    const i = visible.indexOf(tile);
    if (i < 0) return;
    vf.classList.remove('is-clean');
    show(i);
    if (!vf.open) vf.showModal();
    document.documentElement.classList.add('vf-open');
    pushed = true;
    location.hash = 'photo';
  }

  function close(fromHash = false) {
    if (!vf.open) return;
    vf.close();
    document.documentElement.classList.remove('vf-open');
    if (!fromHash && pushed) {
      pushed = false;
      history.back();
    }
  }

  const zoomed = () => (window.visualViewport?.scale || 1) > 1.05;

  const onClick = (e: MouseEvent) => {
    const el = e.target as HTMLElement;
    const chip = el.closest<HTMLButtonElement>('[data-filter]');
    if (chip) return applyFilter(chip.dataset.filter || 'all');
    const tile = el.closest<HTMLButtonElement>('[data-tile]');
    if (tile) return open(tile);
    if (el.closest('[data-vf-close]')) return close();
    if (el.closest('[data-vf-prev]')) return show(index - 1);
    if (el.closest('[data-vf-next]')) return show(index + 1);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!vf.open) return;
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  };

  const onCancel = (e: Event) => {
    e.preventDefault();
    close();
  };

  const onHash = () => {
    if (location.hash !== '#photo' && vf.open) {
      pushed = false;
      close(true);
    }
  };

  const onTouchStart = (e: TouchEvent) => {
    multi = e.touches.length > 1;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 1) multi = true;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (multi || zoomed()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      show(index + (dx < 0 ? 1 : -1));
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      vf.classList.toggle('is-clean');
    }
  };

  const onStageClick = (e: MouseEvent) => {
    if (e.target === img && matchMedia('(pointer: fine)').matches) vf.classList.toggle('is-clean');
  };

  root.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);
  vf.addEventListener('cancel', onCancel);
  stage.addEventListener('touchstart', onTouchStart, { passive: true });
  stage.addEventListener('touchmove', onTouchMove, { passive: true });
  stage.addEventListener('touchend', onTouchEnd, { passive: true });
  stage.addEventListener('click', onStageClick);
  if (location.hash === '#photo') history.replaceState(history.state, '', location.pathname);

  return () => {
    close(true);
    root.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onHash);
    vf.removeEventListener('cancel', onCancel);
    stage.removeEventListener('touchstart', onTouchStart);
    stage.removeEventListener('touchmove', onTouchMove);
    stage.removeEventListener('touchend', onTouchEnd);
    stage.removeEventListener('click', onStageClick);
  };
}
