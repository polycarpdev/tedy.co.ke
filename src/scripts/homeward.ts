// src/scripts/homeward.ts
import { buildRoute, paintRoute, simulate, span, time, day, type JourneyData } from './journey-sim';

export function initHomeward(root: ParentNode): () => void {
  const el = root.querySelector<HTMLElement>('[data-homeward]');
  if (!el) return () => {};
  const q = (k: string) => el.querySelector<HTMLElement>(`[data-hw-${k}]`)!;
  let data: JourneyData | null = null;
  let alive = true;

  function render() {
    if (!data?.journey || data.points.length < 2) {
      el.hidden = true;
      return;
    }
    const j = data.journey;
    const pts = data.points;
    const end = j.show_until ? new Date(j.show_until).getTime() : new Date(j.arrive_at).getTime() + 86400000;
    if (Date.now() > end) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const line = q('line');
    buildRoute(line, pts);
    const sim = simulate(data);
    paintRoute(line, pts, sim);
    q('from').textContent = pts[0].name;
    q('to').textContent = pts[pts.length - 1].name;
    const tag = j.rehearsal ? 'Rehearsal · ' : '';
    if (sim.state === 'home') {
      q('kicker').textContent = `${tag}Tedy is home`;
      q('time').textContent = `Arrived ${time(sim.eta)}`;
    } else if (sim.state === 'live') {
      q('kicker').textContent = `${tag}On the way home now`;
      q('time').textContent = j.stopped ? `Brief stop${j.note ? `: ${j.note}` : ''}` : `ETA ${time(sim.eta)}`;
    } else {
      const left = new Date(j.depart_at).getTime() - Date.now();
      q('kicker').textContent = `${tag}Bringing Tedy home · ${day(j.depart_at)}, ${time(j.depart_at)}`;
      q('time').textContent = left > 0 ? span(left) : 'Leaving soon';
    }
  }

  async function load() {
    try {
      const r = await fetch('/api/public/journey');
      const d = await r.json();
      if (alive) {
        data = d;
        render();
      }
    } catch {
      render();
    }
  }

  load();
  const tick = window.setInterval(render, 1000);
  const poll = window.setInterval(() => !document.hidden && load(), 30000);
  return () => {
    alive = false;
    clearInterval(tick);
    clearInterval(poll);
  };
}
