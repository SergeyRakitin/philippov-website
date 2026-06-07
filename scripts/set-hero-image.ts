/**
 * Разовая заливка фонового фото hero в Sanity (siteSettings.heroImage).
 *
 * Скачивает оригинал лесной фотки с тильды, загружает как image-ассет в Sanity,
 * патчит ТОЛЬКО поле heroImage у опубликованного siteSettings (set — остальные
 * поля не трогает, идемпотентно). RU/контент не затрагиваются.
 *
 * Запуск: npx tsx scripts/set-hero-image.ts
 * Требует в .env: SANITY_PROJECT_ID, SANITY_DATASET, SANITY_TOKEN (write).
 */

import 'dotenv/config';
import { createClient } from '@sanity/client';

const SRC = 'https://static.tildacdn.pub/tild3361-3636-4335-b066-393062363331/Screenshot_2026-04-0.png';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '29k7vl30',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
});

async function main() {
  if (!process.env.SANITY_TOKEN) throw new Error('Нет SANITY_TOKEN в .env');

  console.log('Скачиваю оригинал фона hero…');
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`Не скачать фото: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`  получено ${(buf.length / 1024).toFixed(0)} КБ`);

  console.log('Загружаю ассет в Sanity…');
  const asset = await client.assets.upload('image', buf, {
    filename: 'hero-forest.png',
  });
  console.log(`  ассет: ${asset._id} (${asset.metadata?.dimensions?.width}×${asset.metadata?.dimensions?.height})`);

  console.log('Патчу siteSettings.heroImage…');
  await client
    .patch('siteSettings')
    .set({ heroImage: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } } })
    .commit();

  console.log('Готово: siteSettings.heroImage установлен.');
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
