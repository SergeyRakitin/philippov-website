/**
 * Заливка стартового контента в Sanity (по CONTRACT.md).
 *
 * Создаёт/перезаписывает ОПУБЛИКОВАННЫЕ документы (без префикса drafts.) через
 * createOrReplace — идемпотентно, повторный запуск не плодит дубли. RU оставляем
 * пустым: его заполнит scripts/translate-sanity.ts.
 *
 * Запуск:
 *   npm run seed
 *
 * Требует в .env (корень проекта): SANITY_PROJECT_ID, SANITY_DATASET,
 * SANITY_TOKEN (с правами write).
 */

import 'dotenv/config';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '29k7vl30',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
});

// --- Хелперы Portable Text ---

let keyCounter = 0;
function key(prefix = 'k'): string {
  return `${prefix}_${(keyCounter++).toString(36)}`;
}

/** Обычный абзац. */
function paragraph(text: string) {
  return {
    _type: 'block',
    _key: key('blk'),
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: key('sp'), text, marks: [] }],
  };
}

/** Элемент маркированного списка (listItem: 'bullet', level: 1). */
function bullet(text: string) {
  return {
    _type: 'block',
    _key: key('blk'),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs: [],
    children: [{ _type: 'span', _key: key('sp'), text, marks: [] }],
  };
}

/**
 * Сортируемый orderRank для section по индексу: '0|aaaaa' + буква + ':'. Лексикографически
 * возрастает с ростом i, поэтому |order(orderRank) даёт верный порядок.
 */
function orderRank(i: number): string {
  return '0|' + 'a'.repeat(5) + String.fromCharCode(97 + i) + ':';
}

// --- Документы (EN; RU пустой — заполнит translate) ---

const siteSettings = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  name: { _type: 'localeString', en: 'Sergey Philippov', ru: '' },
  role: { _type: 'localeString', en: 'Theatre Composer & Sound Designer', ru: '' },
  heroTagline: {
    _type: 'localeText',
    en: 'Theatre composer and sound designer with 15+ years of experience in leading Russian theatres. Specialising in original composition and immersive sound design for stage productions.',
    ru: '',
  },
  statusNote: {
    _type: 'localeString',
    en: 'UK Global Talent Visa Holder · Relocating to London, Summer 2026',
    ru: '',
  },
};

const aboutSection = {
  _id: 'aboutSection',
  _type: 'aboutSection',
  heading: { _type: 'localeString', en: 'About', ru: '' },
  body: {
    _type: 'localeRichText',
    en: [
      paragraph(
        'Sergey Philippov is a theatre composer and sound designer with over 15 years of experience working with leading Russian theatres.',
      ),
      paragraph(
        'He creates original music and immersive sound design for the stage, shaping the sonic world of each production. His work spans collaborations with the Moscow Art Theatre, the Mayakovsky State Theatre, the Russian Academic Youth Theatre (RAMT) and others.',
      ),
      paragraph(
        'A UK Global Talent Visa holder, he is relocating to London in the summer of 2026 to continue his work in theatre across the UK.',
      ),
    ],
    ru: [],
  },
};

const sectionTheatre = {
  _id: 'section-theatre',
  _type: 'section',
  title: { _type: 'localeString', en: 'Theatre Music', ru: '' },
  slug: { _type: 'slug', current: 'theatre-music' },
  body: {
    _type: 'localeRichText',
    en: [
      paragraph('Original scores composed for productions in leading Russian theatres.'),
      bullet('2026 — A Streetcar Named Desire (Priut Komedianta, Saint-Petersburg)'),
      bullet('2025 — Eugene Onegin (Mayakovsky State Theatre)'),
      bullet('2024 — King Lear (Naum Orlov Chelyabinsk Drama Theatre)'),
      bullet('2022 — Cyrano de Bergerac (Moscow Art Theatre)'),
      bullet('2020 — Romeo and Juliet (Russian Academic Youth Theatre)'),
      bullet('2019 — The Merchant of Venice (Moscow Art Theatre)'),
    ],
    ru: [],
  },
  visible: true,
  orderRank: orderRank(0),
};

const sectionSoundDesign = {
  _id: 'section-sounddesign',
  _type: 'section',
  title: { _type: 'localeString', en: 'Sound Design', ru: '' },
  slug: { _type: 'slug', current: 'sound-design' },
  subtitle: { _type: 'localeString', en: 'Immersive sound for the stage', ru: '' },
  body: {
    _type: 'localeRichText',
    en: [
      paragraph(
        'Immersive sound design tailored to each theatrical production: building spatial soundscapes, atmospheres and effects that draw the audience into the world of the play.',
      ),
      paragraph(
        'From subtle ambience to full multichannel design, the sound becomes an integral part of the staging — supporting the director’s vision and the rhythm of the performance.',
      ),
    ],
    ru: [],
  },
  visible: true,
  orderRank: orderRank(1),
};

const contactSettings = {
  _id: 'contactSettings',
  _type: 'contactSettings',
  heading: { _type: 'localeString', en: 'Contact', ru: '' },
  email: 'sphilippov2017@gmail.com',
  phone: '+79091659533',
  telegram: '',
  availabilityNote: {
    _type: 'localeText',
    en: 'Available for theatre & film productions and creative projects.',
    ru: 'Открыт к участию в театральных постановках, кино и творческих проектах.',
  },
  socials: [
    {
      _type: 'socialLink',
      _key: key('soc'),
      platform: 'soundcloud',
      url: 'https://soundcloud.com/toirblues',
    },
  ],
};

const documents = [siteSettings, aboutSection, sectionTheatre, sectionSoundDesign, contactSettings];

async function main(): Promise<void> {
  console.log('🌱 Заливка стартового контента в Sanity');
  console.log('=======================================');

  if (!process.env.SANITY_TOKEN) {
    console.error('❌ Не задан SANITY_TOKEN в .env (нужны права write)');
    process.exit(1);
  }
  console.log(`📡 projectId=${client.config().projectId} dataset=${client.config().dataset}`);

  for (const doc of documents) {
    try {
      await client.createOrReplace(doc);
      console.log(`  ✅ ${doc._type} → ${doc._id}`);
    } catch (err) {
      console.error(`  ❌ ${doc._type} (${doc._id}):`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\n=======================================');
  console.log('✅ Seed завершён. Дальше: npm run translate (EN → RU)');
}

main().catch((err) => {
  console.error('❌ Критическая ошибка:', err);
  process.exit(1);
});
