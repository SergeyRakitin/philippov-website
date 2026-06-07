# Data Contract — philippov-website

Единый источник правды для имён полей Sanity и GROQ-проекций. Studio и фронтенд
обязаны совпадать по этим именам. Менять — только синхронно в обоих местах.

## Языковая модель

- 2 языка: **EN** и **RU**. Разделяй два понятия:
  - **Редакторский источник ввода (в Studio) — RU**: автор печатает по-русски.
  - **Фронтовый дефолт и база fallback — EN**: `/` = EN, `/ru` = RU; EN всегда заполнен
    (его наполняет перевод RU→EN), потому он — основа fallback.
- Локализованное значение — объект `{ en, ru }`.
- Fallback на фронте: `value[lang] || value.en || ''`.
- Направление автоперевода (кнопка «Перевести», DeepL): **RU → EN**.
- Astro i18n: `defaultLocale: 'en'`, `locales: ['en','ru']`, `prefixDefaultLocale: false`
  → EN без префикса (`/`), RU с префиксом (`/ru`).

Переиспользуемые object-типы в Studio:
- `localeString`  → `{ en: string, ru: string }`
- `localeText`    → `{ en: text,   ru: text }`
- `localeRichText`→ `{ en: array<block>, ru: array<block> }`  (Portable Text)

## Документы

### 1. `siteSettings` (singleton, _id: `siteSettings`)  — Hero
| поле | тип | назначение |
|---|---|---|
| `name` | localeString | «Sergey Philippov» / «Сергей Филиппов» |
| `role` | localeString | подзаголовок под именем: «Theatre Composer & Sound Designer» |
| `heroTagline` | localeText | абзац-вступление в hero |
| `statusNote` | localeString | «UK Global Talent Visa Holder…» (опц.) |
| `heroImage` | image (hotspot) | фон/портрет hero (опц.) |

### 2. `seoSettings` (singleton, _id: `seoSettings`) — SEO
| поле | тип | назначение |
|---|---|---|
| `seoTitle` | localeString | `<title>` (опц., fallback = name + role) |
| `seoDescription` | localeText | meta description (опц., fallback = heroTagline) |
| `ogImage` | image | картинка для соцсетей (опц., fallback = heroImage) |

### 3. `aboutSection` (singleton, _id: `aboutSection`) — About
| поле | тип | назначение |
|---|---|---|
| `heading` | localeString | заголовок секции («About») |
| `body` | localeRichText | биография (rich text) |
| `portrait` | image (hotspot) | портрет (опц.) |

### 4. `section` (orderable document) — произвольные разделы портфолио
| поле | тип | назначение |
|---|---|---|
| `title` | localeString | «Theatre Music» / «Sound Design» |
| `slug` | slug (source: title.en) | якорь раздела (`#<slug>`) |
| `subtitle` | localeString | подзаголовок (опц.) |
| `body` | localeRichText | текст раздела (опц.) |
| `photos` | array<image{caption: localeString}> (hotspot) | карусель фото |
| `videos` | array<`videoItem`> | ссылки на YouTube/Vimeo/др. |
| `audios` | array<`audioItem`> | ссылки на SoundCloud/Spotify/др. |
| `visible` | boolean (initial true) | показывать на сайте |
| `orderRank` | string (orderable) | порядок |

Вложенные object-типы:
- `videoItem` → `{ url: url (required), title: localeString }`
- `audioItem` → `{ url?: url, file?: file (audio), title: localeString }` — url теперь опц., добавлен file; валидация на уровне объекта: «хотя бы одно из url/file»

### 5. `contactSettings` (singleton, _id: `contactSettings`) — Contacts (низ страницы)
| поле | тип | назначение |
|---|---|---|
| `heading` | localeString | заголовок секции («Contact») |
| `email` | string | e-mail |
| `phone` | string | телефон (опц.) |
| `location` | localeString | «London, UK» |
| `availabilityNote` | localeText | «Available for…» (опц.) |
| `socials` | array<`socialLink`> | соцсети/стриминг |

Вложенный тип `socialLink` → `{ platform: string (list: spotify/soundcloud/instagram/telegram/whatsapp/youtube/website), url: url, label: string (опц.) }`

## Порядок сборки страницы (одностраничник)

`Hero (siteSettings)` → `About (aboutSection)` → `Sections (section[], visible==true, order by orderRank)` → `Contact (contactSettings)`.

## GROQ (src/lib/sanity.ts)

Локализованные поля тянем целиком (`{en, ru}`), локализацию делаем на фронте через `getLocalized`.

```groq
// siteSettings
*[_type == "siteSettings"][0]{ name, role, heroTagline, statusNote, heroImage }

// seoSettings
*[_type == "seoSettings"][0]{ seoTitle, seoDescription, ogImage }

// aboutSection
*[_type == "aboutSection"][0]{ heading, body, portrait }

// sections
*[_type == "section" && visible == true]|order(orderRank){
  _id, title, slug, subtitle, body,
  photos[]{ ..., caption },
  videos[]{ url, title },
  audios[]{ url, title, "fileUrl": file.asset->url }
}

// contactSettings
*[_type == "contactSettings"][0]{ heading, email, phone, location, availabilityNote, socials[]{ platform, url, label } }
```

## translatableTypes / singletons (studio/constants/translatableTypes.ts)

```ts
translatableTypes = ['siteSettings','seoSettings','aboutSection','contactSettings','section']
singletonDocumentIds = ['siteSettings','seoSettings','aboutSection','contactSettings']
```

## Медиа-эмбеды (фронт)

- video: YouTube (`youtube.com/watch?v=`, `youtu.be/`) и Vimeo → `<iframe>`; иначе — ссылка.
- audio: загруженный файл (`fileUrl`) → кастомный HTML5-плеер (приоритет); SoundCloud → цветной `<iframe>` (`color=%23c8975a`, акцент сайта); Spotify (`open.spotify.com/...`) → `/embed/`; иначе — ссылка.
- фото: компонент `PhotoCarousel.astro`.
