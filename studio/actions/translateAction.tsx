import type {SanityClient} from '@sanity/client'
import type {PortableTextBlock} from '@portabletext/types'
import {getPublishedId, useClient, useDocumentOperation} from 'sanity'
import type {DocumentActionProps, DocumentActionDescription} from 'sanity'
import {TranslateIcon} from '@sanity/icons'
import {useState} from 'react'

// Прокси для обхода CORS (DeepL). Общий прокси между проектами, override через env.
const DEFAULT_PROXY_URL = 'https://deepl.nomusicians.com/translate'
const PROXY_URL = import.meta.env.SANITY_STUDIO_DEEPL_PROXY_URL || DEFAULT_PROXY_URL
const PROXY_KEY = import.meta.env.SANITY_STUDIO_DEEPL_PROXY_KEY || ''

// Источник — EN (язык по умолчанию), цель перевода — RU.
type Lang = 'EN' | 'RU'

interface PTSpan {
  _type: 'span'
  _key?: string
  text: string
  marks?: string[]
  [key: string]: unknown
}

interface PTMarkDef {
  _type: string
  _key: string
  href?: string
  [key: string]: unknown
}

type PTBlock = PortableTextBlock<PTMarkDef, PTSpan>

function hasContent(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isTranslatableLanguageObject(value: unknown): value is {en?: string; ru?: string} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const hasLanguageKey = 'en' in value || 'ru' in value
  if (!hasLanguageKey) return false
  const candidate = value as {en?: unknown; ru?: unknown}
  const values = [candidate.en, candidate.ru].filter((item) => item !== undefined && item !== null)
  return values.every((item) => typeof item === 'string')
}

function isPortableTextArray(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => item && typeof item === 'object' && item._type === 'block')
}

function isTranslatablePortableTextObject(value: unknown): value is {en?: PTBlock[]; ru?: PTBlock[]} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const hasLanguageKey = 'en' in value || 'ru' in value
  if (!hasLanguageKey) return false
  const candidate = value as {en?: unknown; ru?: unknown}
  const values = [candidate.en, candidate.ru].filter((item) => item !== undefined && item !== null)
  if (!values.every((item) => Array.isArray(item))) return false
  return values.some((item) => isPortableTextArray(item))
}

/**
 * DeepL заменяет middle dot «·» (U+00B7) на дефис. Прячем под sentinel ※ (U+203B):
 * DeepL его не трогает, после перевода возвращаем «·».
 */
const DOT_SENTINEL = '※'

const RETRY_MAX = 3
const RETRY_BASE_MS = 1000
const DELAY_BETWEEN_REQUESTS_MS = 150

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function translateText(text: string, targetLang: Lang, sourceLang: Lang = 'EN'): Promise<string> {
  if (!text || text.trim() === '') return ''
  const protectedText = text.replaceAll('·', DOT_SENTINEL)

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    if (attempt > 0) await delay(RETRY_BASE_MS * Math.pow(2, attempt - 1))

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PROXY_KEY && {'X-Proxy-Key': PROXY_KEY}),
      },
      body: JSON.stringify({
        text: protectedText,
        targetLang,
        target_lang: targetLang,
        source_lang: sourceLang,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (response.status === 429) {
      if (attempt < RETRY_MAX) continue
      throw new Error(`DeepL: превышен лимит запросов после ${RETRY_MAX + 1} попыток`)
    }
    if (!response.ok) throw new Error(`DeepL error: ${response.status}`)

    const data = await response.json()
    const raw = data.translatedText || ''
    if (!raw) throw new Error('DeepL proxy вернул пустой ответ. Проверьте доступность прокси.')

    const translated = raw.replaceAll(DOT_SENTINEL, '·')
    if (translated.trim() === text.trim() && targetLang !== sourceLang) {
      console.warn(`[translate] Текст не изменился при переводе на ${targetLang}: "${text.slice(0, 50)}..."`)
    }
    return translated
  }
  return ''
}

async function translateField(
  field: {en?: string; ru?: string},
  forceOverwrite = false,
): Promise<{en: string; ru: string}> {
  const sourceText = (field.en || '').trim()
  // EN пустой — очищаем RU.
  if (!sourceText) return {en: '', ru: ''}

  const result = {en: field.en || '', ru: field.ru || ''}
  if (!result.ru || forceOverwrite) {
    result.ru = await translateText(sourceText, 'RU', 'EN')
    await delay(DELAY_BETWEEN_REQUESTS_MS)
  }
  return result
}

// --- Portable Text: сериализация / десериализация / перевод ---

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function portableTextToHtml(blocks: PTBlock[]): string {
  return blocks
    .filter((block) => block._type === 'block')
    .map((block) => {
      const style = block.style || 'normal'
      const tag = style === 'blockquote' ? 'blockquote' : /^h[1-6]$/.test(style) ? style : 'p'
      const markDefs: PTMarkDef[] = block.markDefs || []

      const childrenHtml = block.children
        .map((child) => {
          if (child._type !== 'span') return ''
          let html = escapeHtml(child.text || '')
          const marks: string[] = child.marks || []
          for (const mark of marks) {
            if (mark === 'strong') html = `<strong>${html}</strong>`
            else if (mark === 'em') html = `<em>${html}</em>`
            else if (mark === 'underline') html = `<u>${html}</u>`
            else if (mark === 'strike-through') html = `<s>${html}</s>`
            else if (mark === 'code') html = `<code>${html}</code>`
            else {
              const markDef = markDefs.find((md) => md._key === mark)
              if (markDef?._type === 'link' && markDef?.href) {
                html = `<a href="${escapeHtml(markDef.href)}">${html}</a>`
              }
            }
          }
          return html
        })
        .join('')

      return `<${tag}>${childrenHtml}</${tag}>`
    })
    .join('\n')
}

function htmlToPortableText(html: string, originalBlocks: PTBlock[]): PTBlock[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']
  const htmlBlocks = Array.from(doc.body.children).filter((el) => blockTags.includes(el.tagName))
  const originalBlocksOnly = originalBlocks.filter((b) => b._type === 'block')

  if (htmlBlocks.length !== originalBlocksOnly.length) {
    throw new Error(
      `DeepL изменил структуру HTML (ожидалось ${originalBlocksOnly.length} блоков, получено ${htmlBlocks.length}). ` +
        `Возможно, proxy не передаёт tag_handling.`,
    )
  }

  let markKeyCounter = 0
  function generateKey(): string {
    return `tr_${Date.now().toString(36)}_${(markKeyCounter++).toString(36)}`
  }

  const tagToStyle: Record<string, string> = {
    P: 'normal',
    H1: 'h1',
    H2: 'h2',
    H3: 'h3',
    H4: 'h4',
    H5: 'h5',
    H6: 'h6',
    BLOCKQUOTE: 'blockquote',
  }

  const resultBlocks: PTBlock[] = htmlBlocks.map((htmlBlock, index) => {
    const original = originalBlocksOnly[index]
    const newMarkDefs: Array<{_type: string; _key: string; href: string}> = []
    const children: Array<{_type: string; _key: string; text: string; marks: string[]}> = []

    function walkNode(node: Node, activeMarks: string[]): void {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        if (text) children.push({_type: 'span', _key: generateKey(), text, marks: [...activeMarks]})
        return
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const tag = el.tagName
        const newMarks = [...activeMarks]
        if (tag === 'STRONG' || tag === 'B') newMarks.push('strong')
        else if (tag === 'EM' || tag === 'I') newMarks.push('em')
        else if (tag === 'U') newMarks.push('underline')
        else if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') newMarks.push('strike-through')
        else if (tag === 'CODE') newMarks.push('code')
        else if (tag === 'A') {
          const href = el.getAttribute('href')
          if (href) {
            const markKey = generateKey()
            newMarkDefs.push({_type: 'link', _key: markKey, href})
            newMarks.push(markKey)
          }
        }
        for (const child of Array.from(node.childNodes)) walkNode(child, newMarks)
      }
    }

    for (const child of Array.from(htmlBlock.childNodes)) walkNode(child, [])

    return {
      ...original,
      _type: 'block',
      style: tagToStyle[htmlBlock.tagName] || original.style || 'normal',
      children:
        children.length > 0 ? children : [{_type: 'span', _key: generateKey(), text: '', marks: []}],
      markDefs: newMarkDefs,
    } as PTBlock
  })

  const result: PTBlock[] = []
  let blockIdx = 0
  for (const original of originalBlocks) {
    if (original._type === 'block') result.push(resultBlocks[blockIdx++])
    else result.push(original)
  }
  return result
}

async function translateHtml(html: string, targetLang: Lang, sourceLang: Lang = 'EN'): Promise<string> {
  if (!html || html.trim() === '') return ''

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    if (attempt > 0) await delay(RETRY_BASE_MS * Math.pow(2, attempt - 1))

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PROXY_KEY && {'X-Proxy-Key': PROXY_KEY}),
      },
      body: JSON.stringify({
        text: html,
        targetLang,
        target_lang: targetLang,
        source_lang: sourceLang,
        tag_handling: 'html',
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (response.status === 429) {
      if (attempt < RETRY_MAX) continue
      throw new Error(`DeepL: превышен лимит запросов после ${RETRY_MAX + 1} попыток`)
    }
    if (!response.ok) throw new Error(`DeepL error: ${response.status}`)

    const data = await response.json()
    const translated = data.translatedText || ''
    if (!translated) throw new Error('DeepL proxy вернул пустой ответ. Проверьте доступность прокси.')
    return translated
  }
  return ''
}

async function translatePortableTextField(
  field: {en?: PTBlock[]; ru?: PTBlock[]},
  forceOverwrite = false,
): Promise<{en: PTBlock[]; ru: PTBlock[]; warnings: string[]}> {
  const enBlocks = field.en || []
  const hasEnText = enBlocks.some(
    (b) => b._type === 'block' && b.children.some((c) => c._type === 'span' && (c.text || '').trim()),
  )

  if (!hasEnText) return {en: [], ru: [], warnings: []}

  const result = {en: enBlocks, ru: field.ru || [], warnings: [] as string[]}

  const html = portableTextToHtml(enBlocks)
  if (!html.trim()) return {en: [], ru: [], warnings: []}

  if (!result.ru.length || forceOverwrite) {
    try {
      const translatedHtml = await translateHtml(html, 'RU', 'EN')
      if (translatedHtml) result.ru = htmlToPortableText(translatedHtml, enBlocks)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[translate] PT → RU не удалось: ${msg}`)
      result.warnings.push(`RU: ${msg}`)
    }
  }

  return result
}

// Есть ли уже заполненные переводы (RU)?
export function hasExistingTranslations(doc: Record<string, unknown>): boolean {
  if (!doc || typeof doc !== 'object') return false

  for (const key of Object.keys(doc)) {
    const value = doc[key]
    if (value && typeof value === 'object') {
      if (isTranslatablePortableTextObject(value)) {
        if (value.ru && value.ru.length > 0) return true
        continue
      }
      if (isTranslatableLanguageObject(value) && hasContent(value.ru)) return true
      if (Array.isArray(value)) {
        if (isPortableTextArray(value)) continue
        for (const item of value) {
          if (item && typeof item === 'object' && hasExistingTranslations(item as Record<string, unknown>)) {
            return true
          }
        }
      } else if (hasExistingTranslations(value as Record<string, unknown>)) {
        return true
      }
    }
  }
  return false
}

// Рекурсивно находим и переводим все объекты с полями en/ru.
export async function translateDocument(
  doc: Record<string, unknown>,
  forceOverwrite = false,
): Promise<{doc: Record<string, unknown>; warnings: string[]}> {
  const result = {...doc}
  const warnings: string[] = []

  for (const key of Object.keys(doc)) {
    const value = doc[key]
    if (value && typeof value === 'object') {
      if (isTranslatablePortableTextObject(value)) {
        const ptResult = await translatePortableTextField(value, forceOverwrite)
        for (const w of ptResult.warnings) warnings.push(`${key}: ${w}`)
        result[key] = {en: ptResult.en, ru: ptResult.ru}
      } else if (isTranslatableLanguageObject(value)) {
        result[key] = await translateField(value, forceOverwrite)
      } else if (Array.isArray(value)) {
        if (isPortableTextArray(value)) continue
        const items: unknown[] = []
        for (const item of value) {
          if (item && typeof item === 'object') {
            const sub = await translateDocument(item as Record<string, unknown>, forceOverwrite)
            items.push(sub.doc)
            warnings.push(...sub.warnings)
          } else {
            items.push(item)
          }
        }
        result[key] = items
      } else {
        const sub = await translateDocument(value as Record<string, unknown>, forceOverwrite)
        result[key] = sub.doc
        warnings.push(...sub.warnings)
      }
    }
  }
  return {doc: result, warnings}
}

export function buildTranslationChanges(
  original: Record<string, unknown>,
  translated: Record<string, unknown>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {}
  for (const key of Object.keys(translated)) {
    if (key.startsWith('_')) continue
    if (JSON.stringify(original[key]) !== JSON.stringify(translated[key])) {
      changes[key] = translated[key]
    }
  }
  return changes
}

type PatchOperation = {
  execute: (patches: Array<{set: Record<string, unknown>}>) => void
}

export async function runTranslation(options: {
  docId: string
  client: SanityClient
  patch: PatchOperation
  setIsTranslating: (value: boolean) => void
}): Promise<void> {
  const {docId, client, patch, setIsTranslating} = options
  const publishedId = getPublishedId(docId)
  const draftId = `drafts.${publishedId}`

  setIsTranslating(true)
  try {
    const [draft, published] = await Promise.all([
      client.getDocument(draftId),
      client.getDocument(publishedId),
    ])
    const doc = (draft || published) as Record<string, unknown> | null
    if (!doc) {
      alert('Нет документа для перевода')
      return
    }

    let forceOverwrite = false
    if (hasExistingTranslations(doc)) {
      forceOverwrite = confirm(
        'Некоторые поля уже переведены на RU.\n\n' +
          'OK — перезаписать все переводы\n' +
          'Отмена — перевести только пустые поля',
      )
    }

    const {doc: translated, warnings} = await translateDocument(doc, forceOverwrite)
    const changes = buildTranslationChanges(doc, translated)

    if (Object.keys(changes).length > 0) {
      patch.execute([{set: changes}])
      if (warnings.length > 0) {
        alert(
          `⚠️ Перевод частично завершён.\n\n` +
            `Не удалось перевести:\n${warnings.map((w) => `• ${w}`).join('\n')}\n\n` +
            `Эти поля оставлены без изменений.`,
        )
      } else {
        alert('✅ Перевод завершён!')
      }
    } else if (warnings.length > 0) {
      alert(`⚠️ Перевод не выполнен.\n\nПроблемы:\n${warnings.map((w) => `• ${w}`).join('\n')}`)
    } else {
      alert('ℹ️ Нечего переводить')
    }
  } catch (error) {
    console.error('Translation error:', error)
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      alert('❌ DeepL proxy не ответил за 15 секунд.')
    } else {
      alert(`❌ Ошибка перевода: ${error}`)
    }
  } finally {
    setIsTranslating(false)
  }
}

export function TranslateAction(props: DocumentActionProps): DocumentActionDescription {
  const {patch} = useDocumentOperation(props.id, props.type)
  const [isTranslating, setIsTranslating] = useState(false)
  const client = useClient({apiVersion: '2024-01-01'})

  return {
    label: isTranslating ? 'Перевод...' : 'Перевести',
    icon: TranslateIcon,
    group: ['default', 'paneActions'] as const,
    disabled: isTranslating,
    onHandle: async () => {
      if (isTranslating) return
      await runTranslation({docId: props.id, client, patch, setIsTranslating})
    },
  }
}
