// src/data/trail.ts
export type Outfit = 'jersey' | 'army' | 'casual';
export type Accessory = 'none' | 'camera' | 'headphones';

export interface TrailStop {
  slug: string;
  year: number;
  title: string;
  line: string;
  outfit: Outfit;
  accessory: Accessory;
  href: string;
}

export const TRAIL: TrailStop[] = [
  {
    slug: 'born', year: 1999, title: 'Born',
    line: 'Thadeus Esirom Etyang. 7 July 1999. To all of us, just Tedy.',
    outfit: 'jersey', accessory: 'none', href: '/story/#born',
  },
  {
    slug: 'number-six', year: 2011, title: 'No. 6',
    line: 'Number 6 in the primary school first team. Manchester United for life.',
    outfit: 'jersey', accessory: 'none', href: '/story/#number-six',
  },
  {
    slug: 'army', year: 2019, title: 'Kenya Army',
    line: 'He signed up, stood tall, and wore it with pride.',
    outfit: 'army', accessory: 'none', href: '/story/#army',
  },
  {
    slug: 'gatherings', year: 2021, title: 'The Gatherings',
    line: 'Coffee, grills, hikes. If there was a plan, Tedy made it.',
    outfit: 'casual', accessory: 'none', href: '/story/#gatherings',
  },
  {
    slug: 'lens', year: 2023, title: 'Through the Lens',
    line: 'He saw the world through a camera, and made all of us look good in it.',
    outfit: 'casual', accessory: 'camera', href: '/lens/',
  },
  {
    slug: 'studio', year: 2025, title: 'The Studio',
    line: 'Late nights making music. Him and me.',
    outfit: 'casual', accessory: 'headphones', href: '/studio/',
  },
  {
    slug: 'campfire', year: 2026, title: 'The Campfire',
    line: 'The trail ends here, with everyone he brought together.',
    outfit: 'casual', accessory: 'none', href: '/campfire/',
  },
];
