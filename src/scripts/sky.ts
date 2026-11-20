// src/scripts/sky.ts
type Key = {
  top: string;
  bottom: string;
  far: string;
  near: string;
  ground: string;
  fg: string;
  muted: string;
  cloud: string;
  cloudO: number;
};

const KEYS: Key[] = [
  { top: '#9cc2e6', bottom: '#ffd9b0', far: '#a9b8c8', near: '#7d9a7a', ground: '#6e8f4f', fg: '#1d1712', muted: '#4a4038', cloud: '#ffe9d6', cloudO: 0.8 },
  { top: '#79bdf0', bottom: '#d9efff', far: '#9fb7c9', near: '#6f9a6a', ground: '#6a9a48', fg: '#13202b', muted: '#3d4f5c', cloud: '#ffffff', cloudO: 0.9 },
  { top: '#4fa3ea', bottom: '#c6e6fb', far: '#94afc4', near: '#648f5c', ground: '#64913f', fg: '#0f1c27', muted: '#38495a', cloud: '#ffffff', cloudO: 0.85 },
  { top: '#6d9fd3', bottom: '#ffd391', far: '#b49c8a', near: '#7a7f4e', ground: '#77803c', fg: '#22170d', muted: '#54412f', cloud: '#fff1d6', cloudO: 0.75 },
  { top: '#3a4677', bottom: '#ff8a5c', far: '#6a4f6a', near: '#4a3f52', ground: '#3e3a3a', fg: '#fbeee3', muted: '#e4c8b6', cloud: '#ffc2a0', cloudO: 0.45 },
  { top: '#1b2140', bottom: '#6b4466', far: '#2c2840', near: '#1f1d2e', ground: '#1a1a24', fg: '#ece8e1', muted: '#b8b2bf', cloud: '#8a6a8a', cloudO: 0.15 },
  { top: '#07090c', bottom: '#131a22', far: '#0b1016', near: '#0e141b', ground: '#0d1116', fg: '#ece8e1', muted: '#8b9099', cloud: '#222222', cloudO: 0 },
];

const SUNSET = 4 / 6;

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(' ')})`;
};
const clamp = (v: number) => Math.min(Math.max(v, 0), 1);

let last = -1;

export function resetSky() {
  last = -1;
}

export function paintSky(stage: HTMLElement, f: number) {
  if (Math.abs(f - last) < 0.0015) return;
  last = f;

  const span = clamp(f) * (KEYS.length - 1);
  const i = Math.min(Math.floor(span), KEYS.length - 2);
  const t = span - i;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const s = stage.style;

  s.setProperty('--sky-top', mix(a.top, b.top, t));
  s.setProperty('--sky-bottom', mix(a.bottom, b.bottom, t));
  s.setProperty('--far', mix(a.far, b.far, t));
  s.setProperty('--near', mix(a.near, b.near, t));
  s.setProperty('--ground', mix(a.ground, b.ground, t));
  s.setProperty('--fg', mix(a.fg, b.fg, t));
  s.setProperty('--muted', mix(a.muted, b.muted, t));
  s.setProperty('--cloud', mix(a.cloud, b.cloud, t));
  s.setProperty('--cloud-o', String(a.cloudO + (b.cloudO - a.cloudO) * t));

  const sp = clamp(f / SUNSET);
  const arc = Math.sin(Math.PI * sp);
  s.setProperty('--sun-x', `${8 + 84 * sp}%`);
  s.setProperty('--sun-y', `${74 - 60 * arc}%`);
  s.setProperty('--sun-o', String(1 - clamp((f - SUNSET) / 0.05)));
  s.setProperty('--sun', mix('#ffb070', '#fff3c4', arc));

  const mp = clamp((f - 0.75) / 0.25);
  s.setProperty('--moon-x', `${82 - 12 * mp}%`);
  s.setProperty('--moon-y', `${64 - 46 * mp}%`);
  s.setProperty('--moon-o', String(mp));
  s.setProperty('--star-o', String(clamp((f - 0.6) / 0.3)));
}
