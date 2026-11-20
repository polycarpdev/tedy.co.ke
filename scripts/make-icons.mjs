// scripts/make-icons.mjs
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const mark =
  '<rect x="16" y="16" width="32" height="7" fill="#ece8e1"/>' +
  '<rect x="28.5" y="16" width="7" height="32" fill="#ece8e1"/>' +
  '<rect x="40" y="41" width="7" height="7" fill="#da291c"/>';

const svg = (radius, scale) => {
  const off = (64 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${radius}" fill="#07090c"/><g transform="translate(${off} ${off}) scale(${scale})">${mark}</g></svg>`;
};

const outputs = [
  ['public/icons/icon-192.png', 192, svg(0, 1)],
  ['public/icons/icon-512.png', 512, svg(0, 1)],
  ['public/icons/maskable-512.png', 512, svg(0, 0.75)],
  ['public/apple-touch-icon.png', 180, svg(0, 1)],
];

await mkdir('public/icons', { recursive: true });
for (const [file, size, s] of outputs) {
  await sharp(Buffer.from(s), { density: (72 * size) / 64 }).resize(size, size).png().toFile(file);
}
await writeFile('public/favicon.svg', svg(14, 1));
console.log('Icons written');
