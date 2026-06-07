# Developer — Studio: русские названия + заголовок «Главной» + Hero-фото + вынос SEO в отдельный singleton

**Статус:** К выполнению
**Приоритет:** Высокий
**Сложность:** L
**Ревью:** Стандартное — затрагивает CONTRACT.md + GROQ + новый singleton + фронт-потребитель SEO
**Модель:** opus
**Модель ревью:** opus
**Двойной план:** Нет
**Ресёрч:** оркестратор уже собрал (находки ниже — точные строки/файлы)
**Создана:** 2026-06-07

---

## Goal

Привести Studio к чистому виду по 4 пунктам пользователя (скриншоты в чате):
1. Названия сущностей в сайдбаре — **только русские**, без англ. префикса
   («Hero / Главная» → «Главная» и т.д.). «🎼 Разделы» уже ок.
2. Документ «Главная» показывает в шапке справа имя «Sergey Philippov» (из поля `name`).
   Нужно, чтобы заголовок документа был **названием секции** — «Главная».
3. Поле «Фоновое фото / портрет» переименовать в **«Hero-фото»**.
4. **SEO-поля вынести в ОТДЕЛЬНЫЙ singleton-документ «SEO»** — отдельный пункт в
   сайдбаре «Контент» (решение пользователя). Сейчас они живут во вкладке «SEO»
   внутри «Главной» (`siteSettings`, group `seo`). Перенести в новый тип `seoSettings`.

## Scope

### Часть 1 — Русские названия (Studio-подписи)

- `studio/sanity.config.ts` — desk-структура:
  - `.title('🏠 Hero / Главная')` → `.title('🏠 Главная')`
  - `.title('📄 About / О себе')` → `.title('📄 О себе')`
  - `.title('📞 Contacts / Контакты')` → `.title('📞 Контакты')`
  - Комментарии-разделители (`// === Hero / Главная ... ===`) — на русские.
- `studio/schemaTypes/siteSettings.ts`: `title: 'Hero / Главная'` → `title: 'Главная'`.
- `studio/schemaTypes/aboutSection.ts`: `title: 'About / О себе'` → `title: 'О себе'`;
  preview fallback `'About / О себе'` → `'О себе'`.
- `studio/schemaTypes/contactSettings.ts`: `title: 'Contacts / Контакты'` → `title: 'Контакты'`;
  preview fallback `'Contacts / Контакты'` → `'Контакты'`.
- НЕ трогать метки `'EN'`/`'RU'` в `studio/schemaTypes/locale.ts` — это подписи языковых
  инпутов, не дубли. Названия полей внутри документов уже русские — не трогать.
  `name`-идентификаторы типов/полей НЕ менять (контракт данных) — только `title`/preview.

### Часть 2 — Заголовок документа «Главная»

- `studio/schemaTypes/siteSettings.ts`, блок `preview`: сейчас
  `select: {title: 'name.en'}` → заголовок = значение поля name («Sergey Philippov»).
  Сделать так, чтобы заголовок документа всегда был **«Главная»**:
  ```ts
  preview: {
    prepare() {
      return {title: 'Главная', media: () => '🏠'}
    },
  }
  ```
  (убрать `select`, вернуть фиксированный title). Это singleton — динамический заголовок
  по имени не нужен.

### Часть 3 — Поле heroImage → «Hero-фото»

- `studio/schemaTypes/siteSettings.ts`, поле `heroImage`:
  `title: 'Фоновое фото / портрет'` → `title: 'Hero-фото'`. `name: 'heroImage'` НЕ менять.

### Часть 4 — Вынос SEO в отдельный singleton `seoSettings`

**4.1 Новый тип** `studio/schemaTypes/seoSettings.ts`:
```ts
import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'seoSettings',
  title: 'SEO',
  type: 'document',
  icon: () => '🔍',
  fields: [
    defineField({name: 'seoTitle', title: 'SEO Title', type: 'localeString'}),
    defineField({name: 'seoDescription', title: 'SEO Description', type: 'localeText'}),
    defineField({name: 'ogImage', title: 'OG-картинка (соцсети)', type: 'image'}),
  ],
  preview: {prepare() {return {title: 'SEO', media: () => '🔍'}}},
})
```

**4.2 Убрать SEO из** `studio/schemaTypes/siteSettings.ts`:
- удалить поля `seoTitle`, `seoDescription`, `ogImage`;
- удалить весь массив `groups` и `group: 'hero'` у оставшихся полей (после удаления
  SEO остаётся одна группа → вкладки не нужны, форма станет плоской — это ожидаемо/чище).
  Останутся поля: `name`, `role`, `heroTagline`, `statusNote`, `heroImage`.

**4.3 Регистрация типа** `studio/schemaTypes/index.ts`:
- импортировать `seoSettings`, добавить в массив `schemaTypes` (рядом с другими документами).

**4.4 Desk-пункт** `studio/sanity.config.ts`:
- добавить пункт сайдбара для `seoSettings` — поставить **после «Главной»** (тематически
  это мета сайта), как singleton:
  ```ts
  S.listItem()
    .id('seoSettings')
    .title('🔍 SEO')
    .child(S.document().schemaType('seoSettings').documentId('seoSettings')),
  ```

**4.5 Перевод/синглтоны** `studio/constants/translatableTypes.ts`:
- `seoTitle`/`seoDescription` локализованы → добавить `'seoSettings'` в `translatableTypes`
  И в `singletonDocumentIds`.

### Часть 5 — Синхронизация контракта данных и фронта (обязательно)

**5.1 GROQ/типы** `src/lib/sanity.ts`:
- Запрос `siteSettings`: убрать `seoTitle, seoDescription, ogImage` →
  `{ name, role, heroTagline, statusNote, heroImage }`.
- Тип `SiteSettings`: убрать `seoTitle?`, `seoDescription?`, `ogImage?`.
- Добавить новый запрос `seoSettings: *[_type == "seoSettings"][0]{ seoTitle, seoDescription, ogImage }`.
- Добавить тип `SeoSettings { seoTitle?: LocaleString; seoDescription?: LocaleString; ogImage?: SanityImage }`
  и функцию `getSeoSettings(): Promise<SeoSettings | null>` (через `safeFetch`, fallback `null`).

**5.2 Фронт-потребитель** `src/pages/[...lang]/index.astro` (строки ~16, 35, 47-53):
- импортировать и вызвать `getSeoSettings()` (добавить в `Promise.all`/список загрузок рядом с `getSiteSettings()`);
- `seoTitle` читать из `seo?.seoTitle`; `description` — из `seo?.seoDescription` (fallback на `settings?.heroTagline` — **остаётся**);
- `ogSource = seo?.ogImage || settings?.heroImage` (**heroImage остаётся в siteSettings** — это hero-поле, НЕ переносим);
- остальная логика (`title = seoTitle || name+role || brand`, urlFor) не меняется, только источник SEO.
- i18n fallback везде через `getLocalized` (lang→en→'') — НЕ ломать.

**5.3 CONTRACT.md** (синхронно — жёсткое правило `_shared.md`):
- В таблице `siteSettings` убрать строки `seoTitle`, `seoDescription`, `ogImage`
  (подзаголовок поправить: было «Hero + SEO» → «Hero»).
- Добавить новый раздел документа `### N. seoSettings (singleton, _id: seoSettings) — SEO`
  с таблицей полей (seoTitle/seoDescription/ogImage).
- В блоке GROQ обновить запрос `siteSettings` (без SEO) и добавить запрос `seoSettings`.
- В секции `translatableTypes / singletons` добавить `'seoSettings'` в оба массива.

**5.4 CLAUDE.md** — в разделе «Sanity» в перечень документов добавить `seoSettings` (SEO, singleton).

## Не делаем
- **НЕ писать в Sanity, НЕ запускать `npm run translate`** (DeepL — общие кредиты, гейтит
  оркестратор). Существующие значения SEO (если были в старом `siteSettings`) НЕ мигрируем
  кодом — это сделает оркестратор/пользователь вручную в новом документе при необходимости
  (см. Риски). Просто меняем схему/контракт/фронт.
- НЕ трогать фронт сверх SEO-потребителя (Hero/About/Section/Contact не меняем).
- НЕ менять архитектуру (SSG), i18n-модель, Astro-конфиг.

## Как проверить
- `cd studio && npx tsc --noEmit` — без ошибок типов в Studio.
- `npm run build` (корень) — зелёный (фронт собирается с новым `getSeoSettings`).
- Grep по `studio/`: строк `Hero /`, `About /`, `Contacts /` нет (англ. `description`-примеры
  типа «Например: About» НЕ трогаем).
- Grep по `src/`: `settings?.seoTitle`/`settings?.ogImage` больше нет — SEO читается из `seo?.*`.
- В `dist` метатеги `<title>`/`description`/`og:image` присутствуют (fallback работает даже
  при пустом `seoSettings`: title→name+role, description→heroTagline, og→heroImage).

## Риски
- **Орфан-данные:** если в старом `siteSettings` были заполнены seoTitle/seoDescription/ogImage,
  после переноса схемы они останутся в документе siteSettings, но не будут читаться. Проект
  свежий — вероятно пусто. В «Выполнении» отметь, проверял ли наличие (можно через GROQ
  read-only в `npx sanity documents query`, БЕЗ записи) — если данные есть, оркестратор
  перенесёт их вручную.
- После удаления `groups` из siteSettings вкладки «Hero»/«SEO» исчезнут (форма плоская) — это
  ожидаемо (SEO ушёл в свой документ).

---

## Выполнение
<!-- Заполняет Developer -->

## Ревью
<!-- Заполняет Reviewer -->
