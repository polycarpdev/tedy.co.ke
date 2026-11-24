// src/scripts/journey-page.ts
import { buildRoute, paintRoute, simulate, span, time, day, type JourneyData } from './journey-sim';

export function initJourneyPage(el: HTMLElement): () => void {
  const q = (k: string) => el.querySelector<HTMLElement>(`[data-jy-${k}]`)!;
  let data: JourneyData | null = null;
  let alive = true;
  let rowsKey = '';

  function rows() {
    const pts = data!.points;
    const key = pts.map((p) => p.name).join('|');
    if (key === rowsKey) return;
    rowsKey = key;
    q('stops').replaceChildren(
      ...pts.map(() => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="jy-dot"></span><b></b><span class="jy-when"></span>';
        return li;
      })
    );
  }

  function render() {
    if (!data?.journey || data.points.length < 2) return;
    const j = data.journey;
    const pts = data.points;
    const sim = simulate(data);
    const tag = j.rehearsal ? 'Rehearsal · ' : '';
    q('date').textContent = `${tag}${day(j.depart_at)} · ${pts[0].name} to ${pts[pts.length - 1].name}`;
    buildRoute(q('line'), pts);
    paintRoute(q('line'), pts, sim);
    rows();

    const left = new Date(j.depart_at).getTime() - Date.now();
    if (sim.state === 'home') {
      q('status').textContent = 'Tedy is home.';
      q('meta').textContent = `Arrived at ${pts[pts.length - 1].name} at ${time(sim.eta)}`;
    } else if (sim.state === 'live') {
      q('status').textContent = j.stopped
        ? `Stopped for a moment${j.note ? `: ${j.note}` : ''}`
        : `On the way to ${pts[sim.next].name}`;
      const ago = Math.max(0, Math.round((Date.now() - new Date(j.updated_at).getTime()) / 60000));
      q('meta').textContent = `ETA ${time(sim.eta)} · Updated ${ago ? `${ago} min ago` : 'just now'}`;
    } else {
      q('status').textContent = left > 0 ? span(left) : 'Leaving soon';
      q('meta').textContent = `Leaves ${pts[0].name} at ${time(j.depart_at)}. Expected home around ${time(j.arrive_at)}.`;
    }

    el.querySelectorAll<HTMLLIElement>('[data-jy-stops] li').forEach((li, i) => {
      const p = pts[i];
      li.querySelector('b')!.textContent = p.name;
      li.className = p.passed_at ? 'is-done' : i === sim.next && sim.state === 'live' ? 'is-next' : '';
      const when = li.querySelector<HTMLElement>('.jy-when')!;
      if (p.passed_at) {
        when.textContent = `${i === 0 ? 'Left' : i === pts.length - 1 ? 'Arrived' : 'Passed'} ${time(p.passed_at)}`;
      } else if (i === sim.next && sim.state === 'live') {
        when.textContent = `Expected ${time(sim.nextAt)}`;
      } else {
        when.textContent = `Planned ${time(p.planned_at)}`;
      }
    });
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
  const poll = window.setInterval(() => !document.hidden && load(), 20000);
  return () => {
    alive = false;
    clearInterval(tick);
    clearInterval(poll);
  };
}
