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

const CAR = `<svg viewBox="0 0 80 22" aria-hidden="true"><path d="M3 17v-5.5c0-1.2.8-2 2-2.2l3-.5 1.5-4.6C10 3 10.6 2.6 11.6 2.6H54c1 0 1.8.4 2.4 1.1L61 9l11.4 1.3c3.3.4 5.1 1.8 5.1 4.3v1.9c0 .9-.6 1.5-1.5 1.5H4.5c-.9 0-1.5-.5-1.5-1z" fill="#f4efe8"/><rect x="11" y="4.4" width="30" height="6.8" rx="1" fill="#20252c"/><path d="M13.4 10.6l1.6-3.4h22l1.6 3.4z" fill="#8a5a3b"/><path d="M15 8.3h22" stroke="#b98257" stroke-width=".5"/><circle cx="21" cy="6.6" r=".9" fill="#fff"/><circle cx="23.2" cy="6.3" r="1" fill="#fff"/><circle cx="25.4" cy="6.6" r=".9" fill="#fff"/><path d="M43.2 4.4h10.4c.9 0 1.6.4 2.2 1l3.8 4.4H43.2z" fill="#20252c"/><path d="M5 13.2h71" stroke="#c9c4bb" stroke-width=".5"/><circle cx="76.4" cy="12.6" r=".8" fill="#ffe3a6"/><circle cx="17" cy="18" r="3.6" fill="#15181c" stroke="#d9d4cb" stroke-width=".9"/><circle cx="17" cy="18" r="1.3" fill="#d9d4cb"/><circle cx="66" cy="18" r="3.6" fill="#15181c" stroke="#d9d4cb" stroke-width=".9"/><circle cx="66" cy="18" r="1.3" fill="#d9d4cb"/></svg>`;

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
