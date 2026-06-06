/**
 * Авто-перевод контента в Sanity через DeepL: EN → RU.
 *
 * Источник — EN (язык по умолчанию), цель — RU. Рекурсивно обходит документы,
 * находит локализованные объекты { en, ru } (строки и Portable Text) и переводит
 * en → ru, если ru пуст (или всегда — при флаге --force).
 *
 * Запуск:
 *   npm run translate                 — все типы, дозаполнить только пустые RU
 *   npm run translate -- --force      — перезаписать ВСЕ переводы RU
 *   npm run translate -- --type section
 *   npm run translate -- --only siteSettings --force
 *
 * Требует в .env (корень проекта):
 *   SANITY_PROJECT_ID, SANITY_DATASET, SANITY_TOKEN (с правами write),
 *   DEEPL_API_KEY (free-ключ с суффиксом :fx).
 */

import 'dotenv/config';
import { createClient } from '@sanity/client';
import type { PortableTextBlock } from '@portabletext/types';

// --- DeepL: прямой server-side вызов (без прокси) ---
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_USAGE_URL = 'https://api-free.deepl.com/v2/usage';

// Типы документов из контракта (translatableTypes).
const TRANSLATABLE_TYPES = ['siteSettings', 'aboutSection', 'contactSettings', 'section'];

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '29k7vl30',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
});

// Источник — EN, цель — RU.
type Lang = 'EN' | 'RU';

// --- Типы Portable Text ---
interface PTSpan {
  _type: 'span';
  _key?: string;
  text: string;
  marks?: string[];
  [key: string]: unknown;
}
interface PTMarkDef {
  _type: string;
  _key: string;
  href?: string;
  [key: string]: unknown;
}
type PTBlock = PortableTextBlock<PTMarkDef, PTSpan>;

// --- Тайминги / ретраи ---
const RETRY_MAX = 3;
const RETRY_BASE_MS = 1000;
const DELAY_BETWEEN_REQUESTS_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Детекторы локализованных значений ---
function hasContent(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isTranslatableLanguageObject(value: unknown): value is { en?: string; ru?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const hasLanguageKey = 'en' in value || 'ru' in value;
  if (!hasLanguageKey) return false;
  const candidate = value as { en?: unknown; ru?: unknown };
  const values = [candidate.en, candidate.ru].filter((item) => item !== undefined && item !== null);
  return values.length > 0 && values.every((item) => typeof item === 'string');
}

function isPortableTextArray(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => item && typeof item === 'object' && item._type === 'block');
}

function isTranslatablePortableTextObject(value: unknown): value is { en?: PTBlock[]; ru?: PTBlock[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const hasLanguageKey = 'en' in value || 'ru' in value;
  if (!hasLanguageKey) return false;
  const candidate = value as { en?: unknown; ru?: unknown };
  const values = [candidate.en, candidate.ru].filter((item) => item !== undefined && item !== null);
  if (values.length === 0 || !values.every((item) => Array.isArray(item))) return false;
  return values.some((item) => isPortableTextArray(item));
}

/**
 * DeepL схлопывает « — » (em dash с пробелами) в «—» без пробелов. Возвращаем
 * пробелы вокруг длинного тире, но только между непробельными символами (тире в
 * начале/конце строки — диалоги — не трогаем). Среднее тире (–) не трогаем: оно
 * без пробелов в диапазонах «2020–2026».
 */
function fixDashSpacing(text: string): string {
  return text.replace(/(?<=\S)[ \t]*—[ \t]*(?=\S)/g, ' — ');
}

/**
 * DeepL заменяет middle dot «·» (U+00B7) на дефис и иногда склеивает части. Прячем
 * под sentinel ※ (U+203B): DeepL его не трогает, после перевода возвращаем «·».
 */
const DOT_SENTINEL = '※';

// --- DeepL: перевод простого текста ---
async function translateText(text: string, targetLang: Lang, sourceLang: Lang = 'EN'): Promise<string> {
  if (!text || text.trim() === '') return '';
  const protectedText = text.replaceAll('·', DOT_SENTINEL);

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    if (attempt > 0) {
      const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.log(`    ⏳ Повтор через ${backoff} мс (попытка ${attempt + 1}/${RETRY_MAX + 1})`);
      await delay(backoff);
    }

    const params = new URLSearchParams({
      text: protectedText,
      target_lang: targetLang,
      source_lang: sourceLang,
    });

    let response: Response;
    try {
      response = await fetch(DEEPL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        },
        body: params.toString(),
        signal: AbortSignal.timeout(20000),
      });
    } catch (err) {
      if (attempt < RETRY_MAX) continue;
      throw new Error(`DeepL: сеть недоступна — ${err instanceof Error ? err.message : String(err)}`);
    }

    if (response.status === 429) {
      if (attempt < RETRY_MAX) continue;
      throw new Error(`DeepL: превышен лимит запросов (429) после ${RETRY_MAX + 1} попыток`);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`DeepL error: ${response.status} ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const raw: string = data.translations?.[0]?.text || '';
    const translated = raw.replaceAll(DOT_SENTINEL, '·');
    // Пробелы вокруг em dash возвращаем только для латиницы (RU/EN — обе латиница/кириллица ок).
    return fixDashSpacing(translated);
  }
  return '';
}

// --- DeepL: перевод HTML (tag_handling=html) для rich text ---
async function translateHtml(html: string, targetLang: Lang, sourceLang: Lang = 'EN'): Promise<string> {
  if (!html || html.trim() === '') return '';

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    if (attempt > 0) {
      const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.log(`    ⏳ Повтор через ${backoff} мс (попытка ${attempt + 1}/${RETRY_MAX + 1})`);
      await delay(backoff);
    }

    const params = new URLSearchParams({
      text: html,
      target_lang: targetLang,
      source_lang: sourceLang,
      tag_handling: 'html',
    });

    let response: Response;
    try {
      response = await fetch(DEEPL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        },
        body: params.toString(),
        signal: AbortSignal.timeout(20000),
      });
    } catch (err) {
      if (attempt < RETRY_MAX) continue;
      throw new Error(`DeepL: сеть недоступна — ${err instanceof Error ? err.message : String(err)}`);
    }

    if (response.status === 429) {
      if (attempt < RETRY_MAX) continue;
      throw new Error(`DeepL: превышен лимит запросов (429) после ${RETRY_MAX + 1} попыток`);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`DeepL error: ${response.status} ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const translated: string = data.translations?.[0]?.text || '';
    if (!translated) throw new Error('DeepL вернул пустой ответ на HTML-перевод');
    return translated;
  }
  return '';
}

// --- Перевод локализованной строки { en, ru } ---
async function translateLocaleString(
  field: { en?: string; ru?: string },
  forceOverwrite: boolean,
): Promise<{ en: string; ru: string }> {
  const sourceText = (field.en || '').trim();
  // EN пустой — очищаем RU (ничего переводить не из чего).
  if (!sourceText) return { en: '', ru: '' };

  const result = { en: field.en || '', ru: field.ru || '' };
  if (!result.ru || forceOverwrite) {
    result.ru = await translateText(sourceText, 'RU', 'EN');
    await delay(DELAY_BETWEEN_REQUESTS_MS);
  }
  return result;
}

// --- Portable Text → HTML ---
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Каждый block (включая элемент списка) сериализуется как ОДИН тег верхнего уровня:
 * <p>/<h3>/<h4>/<blockquote>. Структуру списка (listItem/level) в HTML не выносим —
 * восстановим её из оригинального блока при обратном разборе (DeepL сохраняет порядок
 * и количество блоков). Inline-разметка: strong/em/u/s/code/a.
 */
function portableTextToHtml(blocks: PTBlock[]): string {
  return blocks
    .filter((block) => block._type === 'block')
    .map((block) => {
      const style = (block.style as string) || 'normal';
      const tag = style === 'blockquote' ? 'blockquote' : /^h[1-6]$/.test(style) ? style : 'p';
      const markDefs: PTMarkDef[] = (block.markDefs as PTMarkDef[]) || [];

      const childrenHtml = (block.children as PTSpan[])
        .map((child) => {
          if (child._type !== 'span') return '';
          let html = escapeHtml(child.text || '');
          const marks: string[] = child.marks || [];
          for (const mark of marks) {
            if (mark === 'strong') html = `<strong>${html}</strong>`;
            else if (mark === 'em') html = `<em>${html}</em>`;
            else if (mark === 'underline') html = `<u>${html}</u>`;
            else if (mark === 'strike-through') html = `<s>${html}</s>`;
            else if (mark === 'code') html = `<code>${html}</code>`;
            else {
              const markDef = markDefs.find((md) => md._key === mark);
              if (markDef?._type === 'link' && markDef?.href) {
                html = `<a href="${escapeHtml(markDef.href)}">${html}</a>`;
              }
            }
          }
          return html;
        })
        .join('');

      return `<${tag}>${childrenHtml}</${tag}>`;
    })
    .join('\n');
}

// --- HTML → Portable Text (лёгкий токенайзер, без браузерного DOM) ---

const BLOCK_TAG_TO_STYLE: Record<string, string> = {
  p: 'normal',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  blockquote: 'blockquote',
};

interface ParsedSpan {
  text: string;
  marks: string[];
}

let keyCounter = 0;
function generateKey(): string {
  return `tr_${Date.now().toString(36)}_${(keyCounter++).toString(36)}`;
}

/**
 * Разбивает HTML на блоки верхнего уровня (<p>…</p>, <h3>…</h3>, <blockquote>…).
 * Возвращает массив { tag, inner }.
 */
function splitTopLevelBlocks(html: string): Array<{ tag: string; inner: string }> {
  const blocks: Array<{ tag: string; inner: string }> = [];
  const re = /<(p|h[1-6]|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    blocks.push({ tag: match[1].toLowerCase(), inner: match[2] });
  }
  return blocks;
}

/**
 * Разбирает inline-HTML внутри блока в массив span'ов { text, marks }, аккуратно
 * собирая link-аннотации в markDefs. Стек активных меток ведётся вручную.
 */
function parseInlineHtml(inner: string): { spans: ParsedSpan[]; markDefs: PTMarkDef[] } {
  const spans: ParsedSpan[] = [];
  const markDefs: PTMarkDef[] = [];
  const markStack: string[] = [];
  // Для <a> храним соответствие позиции в стеке → ключ markDef.
  const tokenRe = /<(\/?)(strong|b|em|i|u|s|del|strike|code|a)\b([^>]*)>|([^<]+)/gi;
  let m: RegExpExecArray | null;

  const tagToMark = (tag: string): string => {
    switch (tag) {
      case 'strong':
      case 'b':
        return 'strong';
      case 'em':
      case 'i':
        return 'em';
      case 'u':
        return 'underline';
      case 's':
      case 'del':
      case 'strike':
        return 'strike-through';
      case 'code':
        return 'code';
      default:
        return '';
    }
  };

  while ((m = tokenRe.exec(inner)) !== null) {
    const [, slash, tag, attrs, textChunk] = m;

    if (textChunk !== undefined) {
      const text = unescapeHtml(textChunk);
      if (text) spans.push({ text, marks: [...markStack] });
      continue;
    }

    const lowerTag = (tag || '').toLowerCase();
    if (slash === '/') {
      // Закрываем последнюю соответствующую метку.
      if (lowerTag === 'a') {
        // Снимаем последний link-ключ (он начинается с 'link_').
        for (let i = markStack.length - 1; i >= 0; i--) {
          if (markStack[i].startsWith('link_')) {
            markStack.splice(i, 1);
            break;
          }
        }
      } else {
        const mark = tagToMark(lowerTag);
        const idx = markStack.lastIndexOf(mark);
        if (idx !== -1) markStack.splice(idx, 1);
      }
    } else {
      if (lowerTag === 'a') {
        const hrefMatch = /href\s*=\s*["']([^"']*)["']/i.exec(attrs || '');
        const href = hrefMatch ? unescapeHtml(hrefMatch[1]) : '';
        const key = `link_${generateKey()}`;
        markDefs.push({ _type: 'link', _key: key, href });
        markStack.push(key);
      } else {
        const mark = tagToMark(lowerTag);
        if (mark) markStack.push(mark);
      }
    }
  }

  return { spans, markDefs };
}

/**
 * Восстанавливает Portable Text из переведённого HTML, сохраняя порядок/количество
 * блоков и метаданные (listItem/level/_key) из оригинала. Non-block элементы (если
 * вдруг попадутся) переносим как есть.
 */
function htmlToPortableText(html: string, originalBlocks: PTBlock[]): PTBlock[] {
  const htmlBlocks = splitTopLevelBlocks(html);
  const originalBlocksOnly = originalBlocks.filter((b) => b._type === 'block');

  if (htmlBlocks.length !== originalBlocksOnly.length) {
    throw new Error(
      `DeepL изменил структуру HTML (ожидалось ${originalBlocksOnly.length} блоков, получено ${htmlBlocks.length}).`,
    );
  }

  const rebuilt: PTBlock[] = htmlBlocks.map((hb, index) => {
    const original = originalBlocksOnly[index] as PTBlock & { listItem?: string; level?: number };
    const { spans, markDefs } = parseInlineHtml(hb.inner);

    const children =
      spans.length > 0
        ? spans.map((s) => ({ _type: 'span' as const, _key: generateKey(), text: s.text, marks: s.marks }))
        : [{ _type: 'span' as const, _key: generateKey(), text: '', marks: [] as string[] }];

    // Стиль берём из HTML-тега, но listItem/level/_key — из оригинала (структура списка).
    const block: Record<string, unknown> = {
      ...original,
      _type: 'block',
      style: BLOCK_TAG_TO_STYLE[hb.tag] || (original.style as string) || 'normal',
      children,
      markDefs,
    };
    return block as unknown as PTBlock;
  });

  // Возвращаем в исходном порядке, чередуя с возможными non-block элементами.
  const result: PTBlock[] = [];
  let blockIdx = 0;
  for (const original of originalBlocks) {
    if (original._type === 'block') result.push(rebuilt[blockIdx++]);
    else result.push(original);
  }
  return result;
}

// --- Перевод локализованного rich text { en, ru } ---
async function translateLocaleRichText(
  field: { en?: PTBlock[]; ru?: PTBlock[] },
  forceOverwrite: boolean,
): Promise<{ value: { en: PTBlock[]; ru: PTBlock[] }; warnings: string[] }> {
  const enBlocks = field.en || [];
  const hasEnText = enBlocks.some(
    (b) =>
      b._type === 'block' &&
      (b.children as PTSpan[]).some((c) => c._type === 'span' && (c.text || '').trim()),
  );

  // EN пустой — очищаем RU.
  if (!hasEnText) return { value: { en: enBlocks, ru: [] }, warnings: [] };

  const result = { en: enBlocks, ru: field.ru || [] };
  const warnings: string[] = [];

  if (!result.ru.length || forceOverwrite) {
    const html = portableTextToHtml(enBlocks);
    if (html.trim()) {
      try {
        const translatedHtml = await translateHtml(html, 'RU', 'EN');
        if (translatedHtml) result.ru = htmlToPortableText(translatedHtml, enBlocks);
        await delay(DELAY_BETWEEN_REQUESTS_MS);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(msg);
      }
    }
  }

  return { value: result, warnings };
}

// --- Рекурсивный обход документа ---
async function translateNode(
  node: Record<string, unknown>,
  forceOverwrite: boolean,
): Promise<{ node: Record<string, unknown>; warnings: string[] }> {
  const result: Record<string, unknown> = { ...node };
  const warnings: string[] = [];

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (!value || typeof value !== 'object') continue;

    if (isTranslatablePortableTextObject(value)) {
      const { value: translated, warnings: w } = await translateLocaleRichText(
        value as { en?: PTBlock[]; ru?: PTBlock[] },
        forceOverwrite,
      );
      result[key] = translated;
      for (const msg of w) warnings.push(`${key}: ${msg}`);
    } else if (isTranslatableLanguageObject(value)) {
      result[key] = await translateLocaleString(value as { en?: string; ru?: string }, forceOverwrite);
    } else if (Array.isArray(value)) {
      // Сам Portable Text-массив (а не объект-обёртка) не трогаем.
      if (isPortableTextArray(value)) continue;
      // Вложенные массивы объектов: photos[].caption, videos[].title, audios[].title, socials и т.д.
      const items: unknown[] = [];
      for (const item of value) {
        if (item && typeof item === 'object') {
          const sub = await translateNode(item as Record<string, unknown>, forceOverwrite);
          items.push(sub.node);
          warnings.push(...sub.warnings);
        } else {
          items.push(item);
        }
      }
      result[key] = items;
    } else {
      const sub = await translateNode(value as Record<string, unknown>, forceOverwrite);
      result[key] = sub.node;
      warnings.push(...sub.warnings);
    }
  }

  return { node: result, warnings };
}

function buildChanges(
  original: Record<string, unknown>,
  translated: Record<string, unknown>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(translated)) {
    if (key.startsWith('_')) continue;
    if (JSON.stringify(original[key]) !== JSON.stringify(translated[key])) {
      changes[key] = translated[key];
    }
  }
  return changes;
}

// --- Перевод всех документов одного типа ---
async function translateDocumentsByType(type: string, forceOverwrite: boolean): Promise<void> {
  console.log(`\n📦 Переводим тип «${type}»...`);

  const docs = await client.fetch<Record<string, unknown>[]>(`*[_type == $type && !(_id in path("drafts.**"))]`, {
    type,
  });

  if (!docs?.length) {
    console.log('  ⏭️  Документов нет');
    return;
  }

  for (const doc of docs) {
    console.log(`\n📄 ${doc._type} ${doc._id}`);
    try {
      const { node: translated, warnings } = await translateNode(doc, forceOverwrite);
      const changes = buildChanges(doc, translated);

      if (Object.keys(changes).length > 0) {
        await client
          .patch(doc._id as string)
          .set(changes)
          .commit();
        console.log(`  ✅ Обновлено: ${Object.keys(changes).join(', ')}`);
      } else {
        console.log('  ⏭️  Уже переведено');
      }

      if (warnings.length > 0) {
        console.log('  ⚠️ Предупреждения:');
        for (const w of warnings) console.log(`     • ${w}`);
      }
    } catch (err) {
      console.error(`  ❌ Ошибка документа ${doc._id}:`, err instanceof Error ? err.message : err);
    }
  }
}

// --- Лимит DeepL ---
async function checkUsage(): Promise<void> {
  try {
    const response = await fetch(DEEPL_USAGE_URL, {
      headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.log(`📊 Не удалось проверить лимит DeepL: ${response.status}`);
      return;
    }
    const data = await response.json();
    const used = data.character_count || 0;
    const limit = data.character_limit || 500000;
    const percent = limit ? ((used / limit) * 100).toFixed(1) : '0';
    console.log(
      `📊 DeepL: использовано ${used.toLocaleString()} / ${limit.toLocaleString()} символов (${percent}%), осталось ${(limit - used).toLocaleString()}`,
    );
  } catch (err) {
    console.log('📊 Ошибка проверки лимита DeepL:', err instanceof Error ? err.message : err);
  }
}

// --- Разбор аргументов ---
function parseTypeFilter(argv: string[]): string | null {
  const idx = argv.findIndex((a) => a === '--type' || a === '--only');
  if (idx === -1) return null;
  const value = argv[idx + 1];
  return value && !value.startsWith('--') ? value : null;
}

async function main(): Promise<void> {
  console.log('🌍 DeepL авто-переводчик для Sanity (EN → RU)');
  console.log('=============================================');

  if (!DEEPL_API_KEY) {
    console.error('❌ Не задан DEEPL_API_KEY в .env');
    process.exit(1);
  }
  if (!process.env.SANITY_TOKEN) {
    console.error('❌ Не задан SANITY_TOKEN в .env (нужны права write)');
    process.exit(1);
  }

  const argv = process.argv.slice(2);
  const forceOverwrite = argv.includes('--force');
  const typeFilter = parseTypeFilter(argv);

  if (typeFilter && !TRANSLATABLE_TYPES.includes(typeFilter)) {
    console.error(`❌ Неизвестный тип «${typeFilter}». Доступные: ${TRANSLATABLE_TYPES.join(', ')}`);
    process.exit(1);
  }

  const types = typeFilter ? [typeFilter] : TRANSLATABLE_TYPES;
  console.log(`🎯 Типы: ${types.join(', ')}`);
  console.log(`🔁 Режим: ${forceOverwrite ? 'force (перезапись всех RU)' : 'дозаполнение пустых RU'}`);

  await checkUsage();

  for (const type of types) {
    await translateDocumentsByType(type, forceOverwrite);
  }

  console.log('\n=============================================');
  console.log('✅ Перевод завершён');
  await checkUsage();
}

main().catch((err) => {
  console.error('❌ Критическая ошибка:', err);
  process.exit(1);
});
