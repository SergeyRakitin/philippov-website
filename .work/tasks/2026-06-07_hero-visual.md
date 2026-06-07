# Developer — Hero: TildaSans + полноэкранное фото + кинематографичный параллакс

**Статус:** На ревью
**Приоритет:** Высокий
**Сложность:** L
**Ревью:** Стандартное — визуал + смена типосистемы + новый скролл-эффект
**Модель:** opus
**Модель ревью:** opus
**Двойной план:** Нет
**Ресёрч:** Deep (находки ниже — оркестратор уже собрал)
**Создана:** 2026-06-07

---

## Goal

Первый экран сейчас «уродский», потому что плоский чёрный (фото нет), текст слева в пустоте, шрифт — литературный serif. Эталон — hero тильды (`temp/2026-06-07_playwright_tilda-hero.png`): полноэкранное ч/б фото леса, центрированный текст, чистый sans, скролл-стрелка. Нужно: переключить типосистему на **TildaSans** (как на тильде), переписать Hero в полноэкранный центрированный экран с **кинематографичным параллаксом и плавным затемнением**, добавить скролл-стрелку. Контент берётся из Sanity (`siteSettings`), как сейчас.

## Scope

- **Делаем:**
  1. **TildaSans (self-host, OFL).** Скачать woff2 в `public/fonts/`, объявить `@font-face` в `src/styles/global.css`, переключить токены `--font-display` и `--font-body` на TildaSans. Заголовок — вес 600 (на тильде 72px/600), eyebrow — TildaSans uppercase, letter-spacing ≈ 0.18em (на тильде 14px / 2.5px). Из `src/layouts/Layout.astro` убрать `<link>` Google Fonts (Cormorant/Inter), добавить `preload` локального TildaSans.
  2. **Параллакс.** Портировать `src/lib/parallaxEffect.ts` из донора (см. Research) в `src/lib/`. Адаптировать: `fadeSelector` затемняет в `var(--color-ink)`; селекторы под наш Hero.
  3. **Hero.astro** переписать в паттерн «sticky-раннер»: высокий wrapper → внутри `sticky top-0 h-screen` секция; фон (увеличенный, `inset:-20%`) с фото из `settings.heroImage`; статичный градиент-оверлей; fade-оверлей (цвет `--color-ink`, opacity 0→1 на скролле); **центрированный** контент (eyebrow → имя → tagline → статус); скролл-стрелка (chevron) снизу по центру, гаснет на скролле. Уважать `prefers-reduced-motion` (без движения, контент сразу виден).
  4. Hero-классы — в `@layer components` (`src/styles/global.css`). Inline `style` допустим ТОЛЬКО для значений, вычисляемых в JS (transform/opacity параллакса) — статичные цвета/отступы только классами/токенами (см. `_shared.md` → CSS).
  5. `npm run build` — зелёный.

- **Не делаем:**
  - НЕ трогаем контент в Sanity, **НЕ пишем в Sanity, НЕ запускаем `npm run translate`** (DeepL — общие кредиты, гейтит оркестратор). Заливку `heroImage` в Sanity делает оркестратор отдельно — твой Hero просто читает `settings.heroImage` и работает gracefully, если фото пока нет (как сейчас).
  - НЕ заполняем/рестайлим секции About/section/Contact (контент будет позже).
  - НЕ меняем архитектуру (SSG), i18n, `CONTRACT.md`.
  - НЕ переписываем заглушку statusNote («SOME STATUS») — это контент в Sanity, поправит оркестратор/пользователь.
  - IBM Plex Mono: можно оставить токен `--font-mono` для технических меток ИЛИ убрать ради единообразия с тильдой — на твоё усмотрение, но nav/eyebrow по умолчанию → TildaSans uppercase (как на тильде).

## Шаги
1. [x] Реализовать параллакс по спецификации (см. Research).
2. [ ] TildaSans: вытащить URL woff2 из `https://static.tildacdn.pub/css/fonts-tildasans.css`, скачать в `public/fonts/`, `@font-face`, переключить токены, убрать Google Fonts из Layout.
3. [ ] Портировать `parallaxEffect.ts` в `src/lib/`, адаптировать (fade в `--color-ink`).
4. [ ] Переписать `Hero.astro` (sticky-раннер, центр, стрелка, reduced-motion).
5. [ ] Hero-классы в `@layer components`.
6. [ ] `npm run build` зелёный; убедиться, что dev-сервер после проверки остановлен.

## Как проверить
- `npm run build` — без ошибок.
- `npm run dev` (порт 4322; если занят — Astro сам возьмёт другой): первый экран — центрированный текст TildaSans; при скролле фон уезжает с лёгким zoom-out и плавно затемняется в фон, контент гаснет, стрелка исчезает. `prefers-reduced-motion` → без движения, контент виден сразу. (heroImage может быть ещё не залит — тогда фон пустой, это ок: проверяется логика и типографика. Оркестратор зальёт фото и проверит визуально.)
- НЕ оставлять запущенный dev-сервер.

## Research
**Параллакс (спецификация):**
- Wrapper `height: ~320vh` (mobile portrait 200vh) → внутри `sticky top-0 h-screen overflow-hidden`.
- Фон `absolute inset-[-20%]`, `will-change: transform`; на скролле `translateY(-scrolled*PARALLAX) scale(1 - progress*SCALE)`. Константы: `PARALLAX_DESKTOP=0.25 / MOBILE=0.12`, `SCALE_DESKTOP=0.03 / MOBILE=0.015`, `THRESHOLD=0.26`, `MOBILE_BP=768`.
- `progress = clamp(scrollY / (wrapper.offsetHeight - viewH), 0, 1)`.
- Fade: `raw = progress<=THRESHOLD ? 0 : (progress-THRESHOLD)/(1-THRESHOLD)`; `fade.opacity = raw*raw` (квадратичный easing = «плавное затемнение»).
- Контент: `opacity = max(1 - progress*0.30, 0)`, `translateY(-scrolled*0.28)`. Индикатор: `opacity = max(1 - scrollY/(viewH*0.25), 0)`.
- rAF-троттлинг (`ticking`), `resize` с debounce 150ms, кэш `viewH`.
- **Важная адаптация:** донор инициализируется на `astro:page-load` (у него ViewTransitions). В нашем проекте ViewTransitions НЕТ (см. `src/layouts/Layout.astro` — обычные `<script>` без `astro:page-load`). Инициализировать параллакс обычным образом (модульный `<script>` в Hero.astro исполняется после парсинга; либо `DOMContentLoaded`). Cleanup на `astro:before-swap` НЕ нужен (нет переходов).

**Шрифт TildaSans:** SIL OFL 1.1 (Paratype), self-host разрешён, переменное начертание Light→Black. CSS со ссылками на woff2: `https://static.tildacdn.pub/css/fonts-tildasans.css`. На тильде: headline 72px/600/spacing .5px; eyebrow 14px/600/uppercase/spacing 2.5px; подзаголовок 24px/300.

**Эталон/текущее (скриншоты):** цель — `temp/2026-06-07_playwright_tilda-hero.png`; что было — `temp/2026-06-07_playwright_current-hero.png`.

**Фон hero** (зальёт оркестратор в `siteSettings.heroImage`): оригинал `https://static.tildacdn.pub/tild3361-3636-4335-b066-393062363331/Screenshot_2026-04-0.png`.

**Затрагиваемые файлы:** `src/components/Hero.astro`, `src/styles/global.css`, `src/layouts/Layout.astro`, новый `src/lib/parallaxEffect.ts`, `public/fonts/*`.

---

## Выполнение
<!-- Заполняет Developer -->

**Что сделано**

1. **TildaSans (self-host, OFL).** Скачал переменный `TildaSans-VF.woff2` (вес 250–1000, один файл на все начертания) из `https://static.tildacdn.com/fonts/tildasans/TildaSans-VF.woff2` в `public/fonts/`. В `global.css` добавил `@font-face` (`font-weight: 250 1000; font-display: swap; format('woff2-variations')`). Токены `--font-display` и `--font-body` переключил на `'TildaSans', system-ui, …`. Токен `--font-mono` (IBM Plex Mono) **удалил** — ради единообразия с тильдой (вариант из Scope «убрать ради единообразия»).
2. **Каскад моно → TildaSans.** Классы, использовавшие `--font-mono` (`.eyebrow`, `.eyebrow-muted`, `.nav-link`, `.link-arrow`), репоинтил на `--font-body` (TildaSans uppercase) — это и есть требование задачи «nav/eyebrow → TildaSans uppercase» и эталон тильды. Иначе после удаления Google-линка эти классы молча падали бы в системный моно (билд зелёный, но визуал ломается). Eyebrow: вес 600, letter-spacing 0.18em, 0.78rem (как на тильде 14px/600/2.5px).
3. **Layout.astro.** Убрал `<link>` Google Fonts (Cormorant + Inter + IBM Plex Mono — это был один общий URL) и оба Google-preconnect (`fonts.googleapis.com`, `fonts.gstatic.com`). Добавил `<link rel="preload" href="/fonts/TildaSans-VF.woff2" as="font" type="font/woff2" crossorigin>`. Preconnect `cdn.sanity.io` оставил.
4. **parallaxEffect.ts** (новый, `src/lib/`). Портирован из донора 1:1 по логике/константам (PARALLAX 0.25/0.12, SCALE 0.03/0.015, THRESHOLD 0.26, MOBILE_BP 768, rAF-троттлинг, resize-debounce 150ms, кэш viewH, квадратичный easing fade). Адаптации: цвет затемнения НЕ в JS — задаётся в CSS-классе `.hero-fade` (`var(--color-ink)`), JS пишет только `opacity` (поэтому донорская привязка к `--color-background` отсутствует — прогрепал, не осталось). Убрал упоминание `astro:before-swap` из контракта (cleanup возвращается, но в проекте без ViewTransitions не используется). Добавил первичный `update()` (корректное состояние при восстановлении скролла на reload).
5. **Hero.astro** переписан в sticky-раннер: `.hero-wrapper` (320/200/160vh) → `.hero-sticky` (sticky top-0 h-screen overflow-hidden) → `#hero-bg` (фон `inset:-20%`, background-image из `settings.heroImage` width=2400 с запасом под zoom, класс `.hero-bg-photo` с десатурацией только при наличии фото) → `.hero-gradient` (статичный) → `#hero-fade` → центрированный `#hero-content` (eyebrow=role → h1.hero-name=name → tagline → status) → `#hero-scroll-indicator` (chevron, CSS-bounce). Маппинг полей через `getLocalized` (fallback lang→en→''), имя — `<h1>`. Инициализация параллакса — **обычный модульный `<script>`** (без `astro:page-load`), при `prefers-reduced-motion: reduce` параллакс не запускается (контент сразу виден, fade=0, content opacity=1 по дефолту классов; bounce глушит глобальный reduced-motion-блок).
6. **Hero-классы** — все в `@layer components` (`global.css`): `.hero-wrapper/.hero-sticky/.hero-bg/.hero-bg-photo/.hero-gradient/.hero-fade/.hero-content/.hero-name` (TildaSans 600, clamp 2.5–4.75rem) `/.hero-tagline` (light) `/.hero-scroll-indicator` + `@keyframes hero-bounce`. Точку статуса вынес в класс `.status-dot` (раньше был запрещённый inline `style="background: var(--color-accent)"`).

**Изменённые/новые файлы**
- `public/fonts/TildaSans-VF.woff2` (новый, 85 КБ)
- `src/lib/parallaxEffect.ts` (новый)
- `src/components/Hero.astro` (переписан)
- `src/layouts/Layout.astro` (шрифты)
- `src/styles/global.css` (@font-face, токены шрифтов, репоинт eyebrow/nav на TildaSans, hero-классы, .status-dot)

**Самопроверка**
- i18n fallback — `getLocalized` (lang→en→''), хардкод-английского нет. ✔
- Sanity-поля/GROQ — не затронуты, `CONTRACT.md`/`CLAUDE.md` менять не требуется. ✔
- CSS-grep по diff (Hero.astro, hero-блок global.css): нет `rgba(`/hex/`text-white/`/`opacity-` inline/`--color-background`. Единственный inline `style` в Hero — динамический `background-image: url(...)` (data-driven, разрешено `_shared.md`). ✔ (примечание: дефолтный токен `--font-mono` Tailwind в собранном CSS — это базовый токен фреймворка, не наш; нигде не используется).
- Без heroImage Hero работает gracefully: фон — `background-image` (пустой → сплошной `var(--color-ink)`), битой `<img>` нет. ✔
- `npm run build` — **зелёный** (404 + `/index.html` + `/ru/index.html`). В dist: woff2 скопирован, preload TildaSans в HTML, hero-классы и инлайн параллакс-скрипт присутствуют, Google Fonts/Cormorant/IBM Plex — 0 совпадений. ✔
- dev/preview-серверы (4322/4321, остались от прошлой сессии) остановлены, порты свободны. ✔

**Риски/заметки**
- **Каскад типосистемы глобальный:** переключение `--font-display`/`--font-body` на TildaSans затронуло не только eyebrow/nav, а ВСЕ заголовки (`h1`–`h6`, `.display-xl/lg/md`) — теперь они TildaSans `font-light` (раньше Cormorant serif). Это в scope (смена типосистемы целиком), секций пока нет — визуальный вес заголовков ниже hero оценит оркестратор/ревьюер с контентом. `.hero-name` (вес 600) перебивает глобальный `h1 font-light` через приоритет `@layer components` над base.
- Проверено, что контент hero реально рендерится (не только классы): в `dist/client/index.html` — eyebrow «Theatre Composer & Sound Designer», `h1.hero-name` «Sergey Philippov», tagline. Пустого тёмного экрана нет.
- Убран мёртвый импорт `t` из Hero.astro (не использовался; aria-label="Intro" статичный, как и был).
- Жёсткие запреты соблюдены: в Sanity не писал, `npm run translate` не запускал, секции ниже hero не трогал, заглушку statusNote не менял.
- Один inline `style` в Hero (`background-image`) — это вынужденно (URL вычисляется из Sanity на этапе сборки), допущено правилами для data-driven значений.
- Визуально (фон/zoom/затемнение) не проверял — heroImage в Sanity ещё не залит, по задаче визуальную проверку с фото делает оркестратор. Проверена логика, типографика и сборка.

## Исправление замечания (2026-06-07)

**Что исправлено:** мёртвый скролл на reduced-motion / no-JS / краулеров.

По конвенции `.js`-гейтинга (как `.js .reveal` в том же файле):
1. `.hero-wrapper` по умолчанию — `min-height: 100vh` (без большой высоты). No-JS и краулеры получают обычный первый экран.
2. `.js .hero-wrapper` — `height: 320vh` (и media-варианты 200vh/160vh) — включается только при активном JS, когда параллакс реально запускается.
3. В `@media (prefers-reduced-motion: reduce)` добавлен `.js .hero-wrapper { height: auto !important; min-height: 100vh !important; }` — JS есть, `.js` стоит, но параллакс не инициализируется (`if (!prefersReducedMotion)`), раннер не нужен.

Для обычного пути (JS + анимации) `height: 320vh` и параллакс сохранены без изменений.

`npm run build` — зелёный.

## Ревью
<!-- Заполняет Reviewer -->

**Результат: Замечания** (стандартное ревью, без Codex)

**Что проверил**
- Каскад типосистемы: переключение `--font-display`/`--font-body` на TildaSans и удаление `--font-mono`.
- Все компоненты, опирающиеся на типосистему: Header, About, Contact, Footer, Section, Hero.
- Параллакс-логику `parallaxEffect.ts` + reduced-motion + graceful без heroImage.
- CSS-правила `_shared.md` (rgba/hex/inline-hover/токены/data-driven inline style).
- i18n fallback в Hero.
- `npm run build` (зелёный) + наличие шрифта.

**Подтверждено чисто**
1. **Удаление `--font-mono` без регрессов.** Grep по `font-mono`/`--font-mono` в `src/` — 0 совпадений. Все классы, ранее завязанные на mono (`.eyebrow`, `.eyebrow-muted`, `.nav-link`, `.link-arrow`), репоинчены на `--font-body` (TildaSans uppercase) — это требование задачи и эталон тильды. Никто не падает в системный моно. Header (`.nav-link`, `font-display`-бренд), Footer (`.link-arrow`), Contact (`.eyebrow`/`.eyebrow-muted`/`.nav-link`), Section (`.eyebrow`) — все используют классы/токены, регрессов нет.
2. **Каскад заголовков.** h1–h6 и `.display-*` теперь TildaSans `font-light` (было Cormorant serif) — в scope (смена типосистемы целиком). `.hero-name` (вес 600 в `@layer components`) корректно перебивает глобальный `h1 font-light`. Секций с реальным контентом пока нет — итоговую визуальную иерархию заголовков ниже hero оценит оркестратор с фото/контентом. Код корректен.
3. **Параллакс.** Селекторы (`#hero-bg`/`#hero-fade`/`#hero-content`/`#hero-scroll-indicator`/`.hero-wrapper`) совпадают с id/классами в разметке Hero. Деление на ноль недостижимо (`scrollRange = wrapper.offsetHeight − viewH`; wrapper ≥160vh, viewH=100vh → всегда >0). Первичный `update()` даёт корректное состояние при восстановлении скролла. `prefers-reduced-motion` глушит `hero-bounce` глобальным блоком. Привязки к `--color-background` нет (адаптация в `.hero-fade` через `--color-ink`).
4. **CSS / _shared.md.** В Hero.astro и hero-блоке global.css нет `rgba(`/hex/`text-white/`/inline `opacity-`/произвольных `hover:`. Единственный inline `style` в Hero — `background-image: url(...)`, data-driven (URL из Sanity) → разрешено. Точка статуса вынесена в класс `.status-dot` (раньше был запрещённый inline). Все hero-классы — в `@layer components`, цвета через токены.
5. **i18n fallback.** Hero мапит поля через `getLocalized` (lang→en→''), хардкода английского нет.
6. **Graceful без heroImage.** Фон — `background-image` (пустой → сплошной `var(--color-ink)` через `background-color`), битой `<img>` нет, условный класс `.hero-bg-photo` навешивается только при фото.
7. **Сборка.** `npm run build` зелёный (404 + `/index.html` + `/ru/index.html`), `TildaSans-VF.woff2` (85 КБ) на месте, preload в Layout.

**Замечание (1, существенное) — мёртвый скролл на a11y / no-JS-пути**
`.hero-wrapper` имеет фиксированную высоту 320vh (desktop) / 200vh / 160vh — это диапазон скролла для sticky-секции, и работает он только когда JS двигает фон/контент/fade. Но высота wrapper **ничем не схлопывается**, когда параллакс не запущен:
- Гард в Hero.astro — `if (bg && !prefersReducedMotion) initParallax(...)`. При `prefers-reduced-motion: reduce` параллакс не инициализируется. Тот же путь — при отключённом JS и у краулеров.
- Блок `@media (prefers-reduced-motion: reduce)` в global.css трогает только `animation/transition-duration`, `scroll-behavior` и `.reveal` — высоту wrapper не меняет.

Итог: для reduced-motion-юзера (и no-JS / краулера) первый экран статичен, но за ним ~1.6–2.2 экрана пустого скролла, прежде чем появится следующая секция. «Контент сразу виден» соблюдено буквально, но как первый экран сайта это UX-регресс именно на accessibility-пути.

Фикс согласуется с уже существующей в проекте конвенцией `.js`-гейтинга (`.js .reveal` в global.css — «применять только когда JS работает»). Высоту wrapper нужно загейтить так же: полная высота (320/200/160vh) — только при активном параллаксе; при reduced-motion / без JS — схлопнуть до `100vh` (`min-height`), чтобы hero вёл себя как обычный первый экран. Например, перенести «высокую» высоту под селектор `.js .hero-wrapper` + media-query reduced-motion, отдав wrapper по умолчанию `min-height: 100vh`. Решение — на Developer; важно, чтобы при reduced-motion `.hero-wrapper` не давал лишний скролл.

**Прочее (не блокирует, в инфо оркестратору)**
- `npm run build` сообщает `mode: "server"`, `adapter: @astrojs/node`, хотя CLAUDE.md описывает проект как SSG. Страницы префендерятся в статику (`/index.html`, `/ru/index.html`), так что для данной задачи это не регресс — конфиг адаптера задан вне рамок этой задачи. Отмечаю как наблюдение, отдельной задачей не оформляю.
- Мёртвый импорт `t` из Hero.astro убран Developer'ом — подтверждаю, в текущем Hero.astro импорта `t` нет.
