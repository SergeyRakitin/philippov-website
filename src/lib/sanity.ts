import { createClient } from '@sanity/client';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import type { PortableTextBlock } from '@portabletext/types';

// projectId/dataset из окружения с фоллбэком на публичный production-датасет.
const projectId = import.meta.env.SANITY_PROJECT_ID || '29k7vl30';
const dataset = import.meta.env.SANITY_DATASET || 'production';

export const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false, // SSG: контент читается на этапе сборки — нужны свежие данные, не CDN-кэш
});

// Билдер URL изображений Sanity.
const builder = createImageUrlBuilder({ projectId, dataset });

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// ───────────────────────── Типы ─────────────────────────

/** Локализованное значение { en, ru } (EN — источник). */
export type LocaleString = { en?: string; ru?: string };
/** Локализованный rich text { en, ru }. */
export type LocaleRichText = { en?: PortableTextBlock[]; ru?: PortableTextBlock[] };

/** Sanity image object — совместим с urlFor(). */
export type SanityImage = SanityImageSource;

export interface SiteSettings {
  name?: LocaleString;
  role?: LocaleString;
  heroTagline?: LocaleString;
  statusNote?: LocaleString;
  heroImage?: SanityImage;
}

export interface SeoSettings {
  seoTitle?: LocaleString;
  seoDescription?: LocaleString;
  ogImage?: SanityImage;
}

export interface AboutSection {
  heading?: LocaleString;
  body?: LocaleRichText;
  portrait?: SanityImage;
}

export interface VideoItem {
  url: string;
  title?: LocaleString;
}

export interface AudioItem {
  url?: string;
  /** Прямой URL загруженного аудиофайла (file.asset->url). */
  fileUrl?: string;
  title?: LocaleString;
}

export interface SectionPhoto {
  _key?: string;
  asset?: SanityImage;
  caption?: LocaleString;
  // hotspot/crop приходят при наличии — urlFor их учитывает через сам объект
  [key: string]: unknown;
}

export interface Section {
  _id: string;
  title?: LocaleString;
  slug?: { current?: string };
  subtitle?: LocaleString;
  body?: LocaleRichText;
  photos?: SectionPhoto[];
  videos?: VideoItem[];
  audios?: AudioItem[];
}

export type SocialPlatform =
  | 'spotify'
  | 'soundcloud'
  | 'instagram'
  | 'telegram'
  | 'whatsapp'
  | 'youtube'
  | 'website';

export interface SocialLink {
  _key?: string;
  platform: SocialPlatform;
  url: string;
  label?: string;
}

export interface ContactSettings {
  heading?: LocaleString;
  email?: string;
  phone?: string;
  telegram?: string;
  availabilityNote?: LocaleString;
  socials?: SocialLink[];
}

// ───────────────────────── GROQ (строго по CONTRACT.md) ─────────────────────────

export const queries = {
  siteSettings: `*[_type == "siteSettings"][0]{
    name, role, heroTagline, statusNote, heroImage
  }`,

  seoSettings: `*[_type == "seoSettings"][0]{ seoTitle, seoDescription, ogImage }`,

  aboutSection: `*[_type == "aboutSection"][0]{ heading, body, portrait }`,

  sections: `*[_type == "section" && visible == true]|order(orderRank){
    _id, title, slug, subtitle, body,
    photos[]{ ..., caption },
    videos[]{ url, title },
    audios[]{ url, title, "fileUrl": file.asset->url }
  }`,

  contactSettings: `*[_type == "contactSettings"][0]{
    heading, email, phone, telegram, availabilityNote,
    socials[]{ platform, url, label }
  }`,
} as const;

// Безопасная обёртка: при ошибке/пустом Sanity возвращаем fallback, сайт всё равно собирается.
async function safeFetch<T>(query: string, fallback: T): Promise<T> {
  try {
    const data = await client.fetch<T>(query);
    return (data ?? fallback) as T;
  } catch (err) {
    console.error('[Sanity] GROQ error:', err instanceof Error ? err.message : err);
    return fallback;
  }
}

// ───────────────────────── Функции получения данных ─────────────────────────

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return safeFetch<SiteSettings | null>(queries.siteSettings, null);
}

export async function getSeoSettings(): Promise<SeoSettings | null> {
  return safeFetch<SeoSettings | null>(queries.seoSettings, null);
}

export async function getAboutSection(): Promise<AboutSection | null> {
  return safeFetch<AboutSection | null>(queries.aboutSection, null);
}

export async function getSections(): Promise<Section[]> {
  return safeFetch<Section[]>(queries.sections, []);
}

export async function getContactSettings(): Promise<ContactSettings | null> {
  return safeFetch<ContactSettings | null>(queries.contactSettings, null);
}
