// api/src/media.mjs
import './env.mjs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import sharp from 'sharp';

sharp.concurrency(1);
sharp.cache(false);

export const MEDIA_DIR = process.env.MEDIA_DIR || path.join(os.homedir(), 'tedy.co.ke', 'media');
const SIZES = [480, 960, 1600, 2400];

export async function savePhoto(buffer) {
  const file = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  const dir = path.join(MEDIA_DIR, file);
  await mkdir(dir, { recursive: true });
  let width = 0;
  let height = 0;
  try {
    for (const size of SIZES) {
      const info = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: size === 480 ? 72 : 80 })
        .toFile(path.join(dir, `${size}.webp`));
      width = info.width;
      height = info.height;
    }
  } catch (err) {
    await rm(dir, { recursive: true, force: true });
    throw err;
  }
  return { file, width, height };
}

export async function removeMedia(file) {
  if (!/^[a-z0-9]+-[a-f0-9]{8}$/.test(file)) return;
  await rm(path.join(MEDIA_DIR, file), { recursive: true, force: true });
}
