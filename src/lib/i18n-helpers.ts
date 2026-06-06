import type { PortableTextBlock } from '@portabletext/types';
import type { Lang } from '../i18n/translations';
import { defaultLang, languages } from '../i18n/translations';

export const supportedLangs = Object.keys(languages) as Lang[];

/**
 * Пути для getStaticPaths.
 * EN (defaultLang) → params.lang = undefined (без префикса, маршрут `/`).
 * RU → params.lang = 'ru' (маршрут `/ru`).
 */
export function getLangStaticPaths() {
  return supportedLangs.map((lang) => ({
    params: { lang: lang === defaultLang ? undefined : lang },
    props: { lang },
  }));
}

/**
 * Локализованное значение { en, ru } с fallback по контракту:
 * value[lang] || value.en || ''.
 * Принимает также готовую строку (вернёт как есть) и null/undefined.
 */
export function getLocalized(
  value: Partial<Record<Lang, string>> | string | null | undefined,
  lang: Lang,
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || '';
}

/**
 * Локализованный массив Portable Text блоков с fallback:
 * value[lang] || value.en || [].
 */
export function getLocalizedBlocks(
  value: Partial<Record<Lang, PortableTextBlock[]>> | null | undefined,
  lang: Lang,
): PortableTextBlock[] {
  if (!value) return [];
  return value[lang] || value.en || [];
}

/** URL-префикс языка: '' для EN (default), '/ru' для RU. */
export function langPrefix(lang: Lang): string {
  return lang === defaultLang ? '' : `/${lang}`;
}
