// src/data/content.ts
import { TRAIL, type Accessory, type Outfit } from './trail';

export type Photo = {
  file: string;
  width: number;
  height: number;
  caption: string;
  alt: string;
  is_cover: boolean;
};

export type Stop = {
  slug: string;
  year: number;
  title: string;
  line: string;
  body: string;
  outfit: Outfit;
  accessory: Accessory;
  href: string;
  media: Photo[];
  cover: Photo | null;
};

const SOURCE = process.env.CONTENT_URL || 'https://tedy.co.ke/api/public/content';
const PAGES: Record<string, string> = { lens: '/lens/', studio: '/studio/', campfire: '/campfire/' };

const hrefFor = (slug: string) => PAGES[slug] || `/story/#${slug}`;

async function load(): Promise<Stop[]> {
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { stops: Omit<Stop, 'href' | 'cover'>[] };
    if (!data.stops?.length) throw new Error('No stops returned');
    return data.stops.map((s) => ({
      ...s,
      href: hrefFor(s.slug),
      cover: s.media.find((m) => m.is_cover) || s.media[0] || null,
    }));
  } catch (err) {
    console.warn(`[content] Using built-in trail data: ${(err as Error).message}`);
    return TRAIL.map((t) => ({ ...t, body: '', media: [], cover: null }));
  }
}

let cache: Promise<Stop[]> | null = null;
export const getStops = () => (cache ??= load());
