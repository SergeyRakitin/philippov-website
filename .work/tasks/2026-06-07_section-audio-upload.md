# Developer — Раздел: загрузка mp3/wav + красивый аудиоплеер на сайте + цветной SoundCloud

**Статус:** К выполнению
**Приоритет:** Высокий
**Сложность:** L
**Ревью:** Стандартное — Sanity-схема + GROQ + CONTRACT.md + визуал/JS-плеер
**Модель:** opus
**Модель ревью:** opus
**Двойной план:** Нет
**Ресёрч:** оркестратор уже собрал (находки ниже — токены, провайдеры, референс nomusicians)
**Создана:** 2026-06-07

> ⚠️ Запускается ПОСЛЕ задачи `2026-06-07_studio-names-seo.md` (та правит `CONTRACT.md` и
> `src/lib/sanity.ts` — работаешь поверх её изменений, дерево уже чистое). Иначе конфликт файлов.

---

## Goal

Сейчас в раздел (`section.audios`) можно добавить аудио **только ссылкой** (SoundCloud/Spotify),
фронт рисует iframe или ссылку-фоллбэк. Нужно:
1. Дать возможность **загружать аудиофайлы mp3/wav** прямо в Sanity (не только ссылка).
2. На сайте загруженные файлы играют **симпатичным кастомным плеером** в стилистике сайта
   (токены, акцент `--color-accent` #c8975a).
3. Ссылки SoundCloud — плеер, **стилизованный под цвета сайта** (как на nomusicians-website,
   можно чуть иначе). Spotify-ссылки и прочее — как сейчас.

## Scope

### Часть 1 — Studio: файл ИЛИ ссылка в `audioItem`

`studio/schemaTypes/objects.ts`, тип `audioItem`:
- `url` сделать **НЕ required** (description: «SoundCloud, Spotify и др. — или загрузите файл ниже»).
- Добавить поле файла:
  ```ts
  defineField({
    name: 'file',
    title: 'Аудиофайл (mp3 / wav)',
    type: 'file',
    options: {accept: 'audio/*,.mp3,.wav'},
  }),
  ```
- Валидация «хотя бы одно из url/file» через `Rule.custom` на уровне объекта:
  ```ts
  validation: (Rule) =>
    Rule.custom((fields) => {
      if (!fields?.url && !fields?.file) return 'Укажите ссылку или загрузите файл'
      return true
    }),
  ```
  (custom вешается на сам `defineType({... validation})` объекта, не на отдельное поле —
  чтобы видеть оба значения. Проверь сигнатуру: для object-типа `Rule.custom` получает весь объект.)
- preview: показывать title; subtitle — url ИЛИ имя файла (`select: {title:'title.en', url:'url', fileName:'file.asset.originalFilename'}`; в prepare: `subtitle: url || fileName || 'Аудиофайл'`).
- НЕ менять `name: 'audioItem'` и `section.ts` (он ссылается `{type:'audioItem'}` — без изменений).

### Часть 2 — Контракт + GROQ + типы

`CONTRACT.md` (синхронно — жёсткое правило):
- Обновить вложенный тип: `audioItem → { url?: url, file?: file(audio), title: localeString }` (url теперь опц., добавлен file; «хотя бы одно из url/file»).
- В секции «Медиа-эмбеды (фронт)» (строки ~104-108) дополнить: «audio: загруженный файл → кастомный
  HTML5-плеер; SoundCloud → цветной iframe (accent сайта); Spotify → /embed/; иначе — ссылка».
- В GROQ-блоке обновить проекцию `audios[]` (см. ниже).

`src/lib/sanity.ts`:
- GROQ `sections` → проекция аудио: `audios[]{ url, title, "fileUrl": file.asset->url }`.
- Тип `AudioItem`: добавить `fileUrl?: string` (url сделать `url?: string`).
- Датасет public → asset-URL читается публично; проверь, что URL вида
  `https://cdn.sanity.io/files/29k7vl30/production/<...>.mp3` резолвится.

### Часть 3 — Фронт: рендер по приоритету

`src/components/AudioEmbed.astro` — порядок выбора:
1. `item.fileUrl` есть → **кастомный плеер** (часть 4).
2. иначе `embedUrl` (SoundCloud/Spotify через `getAudioEmbedUrl`) → iframe (как сейчас).
3. иначе → ссылка-фоллбэк (как сейчас).

`src/lib/mediaHelpers.ts`:
- `getAudioEmbedUrl(...)` дефолт акцента `accentHex = 'b8895a'` → **`'c8975a'`** (реальный
  `--color-accent` сайта). Это и есть «SoundCloud под цвета сайта». Остальное не трогать.

### Часть 4 — Кастомный аудиоплеер (загруженные файлы)

- Разметка в `AudioEmbed.astro` (ветка fileUrl): контейнер `.audio-player` с:
  - скрытый `<audio preload="metadata" src={item.fileUrl}>`;
  - кнопка play/pause `.audio-player__btn` (svg play↔pause, `aria-label` через i18n);
  - прогресс-дорожка `.audio-player__bar` (кликабельная) + заливка `.audio-player__fill`;
  - тайминги `.audio-player__time` (текущее / общее, формат m:ss);
  - заголовок трека (title) рядом/над плеером.
- JS: **один** модульный `<script>` в `AudioEmbed.astro` (Astro дедупит обработанные
  `<script>` и исполняет один раз глобально). Внутри:
  `document.querySelectorAll('.audio-player').forEach(wire)` — инициализация **per-instance**,
  НЕ один глобальный плеер. На каждый: toggle play/pause, `timeupdate` → ширина `.fill` +
  текущее время, `loadedmetadata` → длительность, клик по `.bar` → seek (по доле от ширины),
  `ended` → сброс в play. Формат времени m:ss.
- Координацию «пауза остальных при старте» НЕ добавлять (пользователь не просил; `_shared.md` —
  без «на будущее»).
- Стили — `src/styles/global.css` → `@layer components`: `.audio-player`, `.audio-player__btn`,
  `.audio-player__bar`, `.audio-player__fill`, `.audio-player__time`, `.audio-player__title`.
  Только токены (`--color-accent`, `--color-surface`, `--color-line-soft`,
  `--color-text-secondary`, `--radius-md`), сперва ищи существующие. Никаких inline-цветов/rgba/hex
  и arbitrary Tailwind в разметке (`_shared.md` → CSS). Единственный допустимый inline-style —
  динамическая ширина `.fill` через JS (data-driven).
- i18n: добавить ключи `media.play` / `media.pause` в `src/i18n/translations.ts` (en+ru),
  использовать в `aria-label` кнопки. Существующие `media.audio/listen/...` не ломать.

## Не делаем
- **НЕ писать в Sanity, НЕ запускать `npm run translate`** (DeepL — общие кредиты, гейтит оркестратор).
- НЕ тащить персистентный глобальный SoundCloud-плеер из nomusicians (Widget API, mini/inline,
  ViewTransitions) — для одностраничника оверкилл. SoundCloud остаётся цветным iframe.
- НЕ менять Spotify-ветку, video-эмбеды, архитектуру, i18n-модель.

## Как проверить
- `cd studio && npx tsc --noEmit` — Studio без ошибок (audioItem валиден).
- `npm run build` (корень) — зелёный.
- Grep по diff `AudioEmbed.astro` / аудио-блока `global.css`: нет `rgba(`/hex/`text-white/`/
  arbitrary hover/transition inline (кроме динамической ширины `.fill`).
- Логика: при `fileUrl` рендерится `.audio-player` (а не iframe); при SoundCloud-URL — iframe
  с `color=%23c8975a`; при Spotify — `/embed/`; пустое — ссылка.
- dev-сервер после проверки остановлен.

## Research
- **Акцент сайта:** `--color-accent: #c8975a` (`src/styles/global.css:36`), `--color-accent-bright: #e0b06a`.
  Прочие токены плеера — `--color-surface`, `--color-line-soft`, `--color-text-secondary`,
  `--radius-md` (есть в global.css, проверь точные имена).
- **Текущий AudioEmbed** уже умеет SoundCloud (`color=%23<accent>`, visual:false, compact) и
  Spotify (`/embed/`). Через `detectProvider`/`getAudioEmbedUrl`/`getAudioEmbedHeight`
  (`src/lib/mediaHelpers.ts`). Файловой ветки нет — это новое.
- **Референс SoundCloud-стилизации (визуал):** `D:\projects\github\nomusicians-website` —
  `src/lib/audioHelpers.ts`, `src/components/GlobalSoundCloudPlayer.astro` (там цветной iframe
  `color=%23<accent>`). Берём только идею «iframe под акцент», без их персистентной машинерии.
- **Sanity file asset в GROQ:** `"fileUrl": file.asset->url` — стандартная дереференс-проекция;
  для public-датасета URL отдаётся напрямую с cdn.sanity.io.
- **Astro `<script>`:** обработанные модульные скрипты дедуплицируются и исполняются один раз —
  поэтому per-instance wiring через `querySelectorAll`, а не скрипт-на-компонент.

**Затрагиваемые файлы:** `studio/schemaTypes/objects.ts`, `CONTRACT.md`, `src/lib/sanity.ts`,
`src/lib/mediaHelpers.ts`, `src/components/AudioEmbed.astro`, `src/styles/global.css`,
`src/i18n/translations.ts`.

## Риски / честность проверки
- **Воспроизведение файла нельзя проверить визуально без реального mp3 в Sanity** — это сделает
  оркестратор (зальёт тестовый mp3 и подтвердит). В «Выполнении» **прямо напиши**, что
  воспроизведение загруженного файла визуально НЕ проверено (проверена сборка + логика рендера +
  что разметка/JS плеера корректны). Не писать «работает», если не игралось.

---

## Выполнение
<!-- Заполняет Developer -->

## Ревью
<!-- Заполняет Reviewer -->
