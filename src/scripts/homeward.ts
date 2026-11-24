// src/scripts/homeward.ts
type Point = { name: string; km: number; passed_at: string | null };
type Data = {
  journey: { depart_at: string; arrive_at: string; show_until: string | null; stopped: boolean; note: string } | null;
  points: Point[];
};

const TZ = 'Africa/Nairobi';
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const p2 = (n: number) => String(n).padStart(2, '0');

function span(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const rest = `${p2(Math.floor((s % 86400) / 3600))}h ${p2(Math.floor((s % 3600) / 60))}m ${p2(s % 60)}s`;
  return d > 0 ? `${d}d ${rest}` : rest;
}

function short(name: string) {
  const head = name.split(',')[0].trim();
  if (head.length <= 14) return head;
  return head.split(/\s+/).map((w) => w[0]).join('').toUpperCase();
}

export function initHomeward(root: ParentNode): () => void {
  const el = root.querySelector<HTMLElement>('[data-homeward]');
  if (!el) return () => {};
  const q = (k: string) => el.querySelector<HTMLElement>(`[data-hw-${k}]`)!;
  let data: Data | null = null;
  let built = '';
  let alive = true;

  function buildLine(pts: Point[]) {
    const key = pts.map((p) => `${p.name}:${p.km}`).join('|');
    if (key === built) return;
    built = key;
    const max = pts[pts.length - 1].km || 1;
    const line = q('line');
    line.replaceChildren();
    const fill = document.createElement('span');
    fill.className = 'hw-fill';
    line.append(fill);
    pts.forEach((p, i) => {
      const dot = document.createElement('span');
      dot.className = i === 0 || i === pts.length - 1 ? 'hw-dot hw-end' : 'hw-dot';
      dot.style.left = `${(p.km / max) * 100}%`;
      dot.title = p.name;
      line.append(dot);
    });
    q('from').textContent = short(pts[0].name);
    q('to').textContent = short(pts[pts.length - 1].name);
  }

  function render() {
    if (!data?.journey || data.points.length < 2) {
      el.hidden = true;
      return;
    }
    const j = data.journey;
    const pts = data.points;
    const now = Date.now();
    const end = j.show_until ? new Date(j.show_until).getTime() : new Date(j.arrive_at).getTime() + 86400000;
    if (now > end) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    buildLine(pts);
    const passed = pts.filter((p) => p.passed_at);
    const last = passed[passed.length - 1];
    const max = pts[pts.length - 1].km || 1;
    q('line').style.setProperty('--fill', `${last ? (last.km / max) * 100 : 0}%`);
    el.querySelectorAll<HTMLElement>('.hw-dot').forEach((d, i) => d.classList.toggle('is-passed', !!pts[i]?.passed_at));
    const home = pts[pts.length - 1].passed_at;
    if (home) {
      q('kicker').textContent = 'Tedy is home';
      q('time').textContent = `Arrived ${time(home)}`;
    } else if (last) {
      q('kicker').textContent = 'On the way home now';
      q('time').textContent = j.stopped ? `Brief stop${j.note ? `: ${j.note}` : ''}` : `Last: ${last.name}, ${time(last.passed_at!)}`;
    } else {
      const left = new Date(j.depart_at).getTime() - now;
      q('kicker').textContent = `Bringing Tedy home · ${day(j.depart_at)}, ${time(j.depart_at)}`;
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
  const poll = window.setInterval(() => !document.hidden && load(), 60000);
  return () => {
    alive = false;
    clearInterval(tick);
    clearInterval(poll);
  };
}
