// src/data/content.ts
import { TRAIL, type Accessory, type Outfit } from './trail';

export type Photo = {
  file: string;
  width: number;
  height: number;
  caption: string;
  alt: string;
  is_cover: boolean;
  by_tedy: boolean;
};

export type Page = { file: string; width: number; height: number };

export type Stop = {
  slug: string;
  year: number;
  year_end: number | null;
  year_label: string;
  place: string;
  title: string;
  line: string;
  body: string;
  outfit: Outfit;
  accessory: Accessory;
  href: string;
  media: Photo[];
  cover: Photo | null;
};

const BASE = (process.env.CONTENT_URL || 'https://tedy.co.ke/api/public/content').replace(/\/content$/, '');
const PAGES: Record<string, string> = { campfire: '/campfire/' };

export const yearText = (s: Pick<Stop, 'year' | 'year_end' | 'year_label'>) =>
  s.year_label || (s.year_end ? `${s.year}–${s.year_end}` : String(s.year));

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function loadStops(): Promise<Stop[]> {
  try {
    const data = await getJson<{ stops: Omit<Stop, 'href' | 'cover'>[] }>('/content');
    if (!data.stops?.length) throw new Error('No stops returned');
    return data.stops.map((s) => ({
      ...s,
      href: PAGES[s.slug] || `/story/#${s.slug}`,
      cover: s.media.find((m) => m.is_cover) || s.media[0] || null,
    }));
  } catch (err) {
    console.warn(`[content] Using built-in trail data: ${(err as Error).message}`);
    return TRAIL.map((t) => ({ ...t, place: '', year_end: null, year_label: '', body: '', media: [], cover: null }));
  }
}

async function loadEulogy(): Promise<Page[]> {
  try {
    const data = await getJson<{ pages: Page[] }>('/eulogy');
    return data.pages || [];
  } catch (err) {
    console.warn(`[content] No eulogy: ${(err as Error).message}`);
    return [];
  }
}

let stops: Promise<Stop[]> | null = null;
let eulogy: Promise<Page[]> | null = null;
export const getStops = () => (stops ??= loadStops());
export const getEulogy = () => (eulogy ??= loadEulogy());
