// src/scripts/journey-bar.ts
import '../styles/jbar.css';
import { buildRoute, paintRoute, simulate, span, time, type JourneyData } from './journey-sim';

let started = false;

export function initJourneyBar() {
  if (started) return;
  started = true;
  let data: JourneyData | null = null;

  function render() {
    const bar = document.querySelector<HTMLElement>('[data-jbar]');
    if (!bar) return;
    const q = (k: string) => bar.querySelector<HTMLElement>(`[data-jb-${k}]`)!;
    let show = false;
    if (data?.journey && data.points.length >= 2) {
      const j = data.journey;
      const pts = data.points;
      const sim = simulate(data);
      const trail = document.querySelector<HTMLElement>('[data-trail]');
      const onHero = !!trail && trail.dataset.at === 'start';
      const expired = !!j.show_until && Date.now() > new Date(j.show_until).getTime();
      show = sim.state !== 'home' && !expired && location.pathname !== '/journey/' && !onHero;
      if (show) {
        buildRoute(q('line'), pts);
        paintRoute(q('line'), pts, sim);
        const tag = j.rehearsal ? 'Rehearsal · ' : '';
        if (sim.state === 'live') {
          q('kicker').textContent = `${tag}On the way home`;
          q('time').textContent = j.stopped ? 'Brief stop' : `ETA ${time(sim.eta)}`;
        } else {
          const left = new Date(j.depart_at).getTime() - Date.now();
          q('kicker').textContent = `${tag}Bringing Tedy home`;
          q('time').textContent = left > 0 ? span(left) : 'Leaving soon';
        }
      }
    }
    bar.hidden = !show;
    document.documentElement.classList.toggle('has-jbar', show);
  }

  async function load() {
    try {
      const r = await fetch('/api/public/journey');
      data = await r.json();
    } catch {
      data = data || null;
    }
    render();
  }

  load();
  window.setInterval(render, 1000);
  window.setInterval(() => !document.hidden && load(), 30000);
  document.addEventListener('astro:page-load', render);
}
