<!-- Автоматически загружается AI-агентами. Для людей: README.md -->

# Philippov Website

Портфолио Сергея Филиппова — театральный композитор и саунд-дизайнер.
Astro 5 SSG + Sanity CMS + Tailwind CSS 4. Одностраничник.

Astro генерирует статику из данных Sanity. Два языка: **EN (по умолчанию) и RU**,
через файловую маршрутизацию (`src/pages/[...lang]/`). EN без префикса, RU — `/ru`.
Контент весь в Sanity (не хардкод). Перевод EN→RU — DeepL (кнопка «Перевести» в Studio).

## Команды

```bash
npm install              # корень (Astro)
npm run dev              # Astro dev (http://localhost:4321)
npm run build            # сборка
npm run preview          # предпросмотр

cd studio && npm install
npm run dev              # Sanity Studio (http://localhost:3333)

npm run seed             # залить стартовый контент в Sanity (scripts/seed.ts)
npm run translate        # автоперевод EN→RU всего контента (DeepL, scripts/translate-sanity.ts)
```

Lint/test нет. Astro-конфиг вынесен в `config/astro.config.mjs` (уже в npm-скриптах).

## Архитектура

- **Контракт данных** (имена полей Sanity + GROQ): `CONTRACT.md` — единый источник правды.
  Studio и фронт обязаны совпадать. Менять только синхронно.
- **Локализация**: объект `{ en, ru }`. Fallback `value[lang] || value.en || ''`.
  Хелперы — `src/lib/i18n-helpers.ts` (`getLocalized`, `getLocalizedBlocks`, `getLangStaticPaths`, `langPrefix`).
- **GROQ-запросы и типы**: `src/lib/sanity.ts`.
- **Studio-фишки** (`studio/`): кнопка «Перевести» (EN→RU) и «Publish all» в тулбаре,
  тогглы EN/RU скрывают языковые поля, уменьшенные отступы формы.
  Перевод: `studio/actions/translateAction.tsx`. Прокси DeepL — общий с nomusicians
  (`https://deepl.nomusicians.com/translate`, ключ `SANITY_STUDIO_DEEPL_PROXY_KEY`).

## Sanity

- projectId: `29k7vl30`, dataset: `production` (public).
- Документы: `siteSettings` (Hero, singleton), `aboutSection` (About, singleton),
  `section` (произвольные разделы, orderable), `contactSettings` (Контакты, singleton).
- `.env` обязателен (см. `.env.example`). НЕ коммитить — в `.gitignore`.

## Деплой

Пока не настроен (нет домена/сервера). Сайт собирается (`npm run build`), деплой — позже.
НЕ деплоить на VPS nomusicians.

## Язык

Весь видимый пользователю текст и коммиты — на русском. Conventional commits.
