// src/scripts/journey-sim.ts
import '../styles/route.css';

export type Point = { id?: number; name: string; km: number; planned_at: string; passed_at: string | null };
export type JourneyRow = {
  depart_at: string;
  arrive_at: string;
  show_until: string | null;
  stopped: boolean;
  stopped_at: string | null;
  paused_seconds: number;
  note: string;
  updated_at: string;
  rehearsal?: boolean;
};
export type JourneyData = { journey: JourneyRow | null; points: Point[] };
export type Sim = { state: 'soon' | 'due' | 'live' | 'home'; pct: number; eta: number; nextAt: number; next: number; held: boolean };

const TZ = 'Africa/Nairobi';
const ms = (iso: string) => new Date(iso).getTime();
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const p2 = (n: number) => String(n).padStart(2, '0');

export const time = (t: string | number) =>
  new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
export const day = (t: string | number) =>
  new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });

export function span(t: number) {
  const s = Math.max(0, Math.floor(t / 1000));
  const d = Math.floor(s / 86400);
  const rest = `${p2(Math.floor((s % 86400) / 3600))}h ${p2(Math.floor((s % 3600) / 60))}m ${p2(s % 60)}s`;
  return d > 0 ? `${d}d ${rest}` : rest;
}

export function simulate(d: JourneyData, now = Date.now()): Sim {
  const j = d.journey!;
  const pts = d.points;
  const n = pts.length;
  const max = pts[n - 1].km || 1;
  const last = pts.reduce((a, p, i) => (p.passed_at ? i : a), -1);
  if (last === n - 1) {
    const at = ms(pts[n - 1].passed_at!);
    return { state: 'home', pct: 100, eta: at, nextAt: at, next: -1, held: false };
  }
  if (last < 0 && now < ms(j.depart_at)) {
    return { state: 'soon', pct: 0, eta: ms(j.arrive_at), nextAt: ms(j.depart_at), next: 0, held: false };
  }
  const i = Math.max(last, 0);
  const a = pts[i];
  const b = pts[i + 1];
  const aAt = last < 0 ? ms(j.depart_at) : ms(a.passed_at!);
  const startAt = last < 0 ? ms(j.depart_at) : ms(pts[0].passed_at!);
  const plannedSoFar = ms(a.planned_at) - ms(pts[0].planned_at);
  const pace = plannedSoFar > 60000 ? clamp((aAt - startAt) / plannedSoFar, 0.6, 2) : 1;
  const leg = Math.max(60000, (ms(b.planned_at) - ms(a.planned_at)) * pace);
  const held = j.paused_seconds * 1000 + (j.stopped && j.stopped_at ? now - ms(j.stopped_at) : 0);
  const frac = clamp((now - aAt - held) / leg, 0, 0.97);
  const km = a.km + (b.km - a.km) * frac;
  const nextAt = Math.max(aAt + held + leg, now);
  const eta = nextAt + (ms(pts[n - 1].planned_at) - ms(b.planned_at)) * pace;
  return { state: 'live', pct: (km / max) * 100, eta, nextAt, next: i + 1, held: j.stopped };
}

const CAR = `<span class="rt-veh"><img class="rt-body" src="/hearse.webp" alt="" width="560" height="208" decoding="async"><img class="rt-wheel rt-w1" src="/hearse-wheel.webp" alt="" width="128" height="128" decoding="async"><img class="rt-wheel rt-w2" src="/hearse-wheel.webp" alt="" width="128" height="128" decoding="async"></span>`;

export function buildRoute(line: HTMLElement, pts: Point[]) {
  const key = pts.map((p) => `${p.name}:${p.km}`).join('|');
  if (line.dataset.key === key) return;
  line.dataset.key = key;
  const max = pts[pts.length - 1].km || 1;
  const fill = document.createElement('span');
  fill.className = 'rt-fill';
  const dots = pts.map((p, i) => {
    const dot = document.createElement('span');
    dot.className = i === 0 || i === pts.length - 1 ? 'rt-dot rt-end' : 'rt-dot';
    dot.style.left = `${(p.km / max) * 100}%`;
    dot.title = p.name;
    return dot;
  });
  const car = document.createElement('span');
  car.className = 'rt-car';
  car.innerHTML = CAR;
  line.replaceChildren(fill, ...dots, car);
}

export function paintRoute(line: HTMLElement, pts: Point[], sim: Sim) {
  line.style.setProperty('--fill', `${sim.pct.toFixed(2)}%`);
  line.dataset.state = sim.state;
  line.classList.toggle('is-held', sim.held);
  line.querySelectorAll<HTMLElement>('.rt-dot').forEach((d, i) => d.classList.toggle('is-passed', !!pts[i]?.passed_at));
}
