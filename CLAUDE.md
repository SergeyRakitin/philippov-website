<!-- Автоматически загружается AI-агентами. Для людей: README.md -->

# Philippov Website

Портфолио Сергея Филиппова — театральный композитор и саунд-дизайнер.
Astro 5 SSG + Sanity CMS + Tailwind CSS 4. Одностраничник.

Astro генерирует статику из данных Sanity. Два языка: **EN (по умолчанию) и RU**,
через файловую маршрутизацию (`src/pages/[...lang]/`). EN без префикса, RU — `/ru`.
Контент весь в Sanity (не хардкод). Перевод RU→EN — DeepL (кнопка «Перевести» в Studio).

## Команды

```bash
npm install              # корень (Astro)
npm run dev              # Astro dev (http://localhost:4322 — отдельный порт)
npm run build            # сборка
npm run preview          # предпросмотр

cd studio && npm install
npm run dev              # Sanity Studio (http://localhost:3333)

npm run seed             # залить стартовый контент в Sanity (scripts/seed.ts)
npm run translate        # автоперевод RU→EN всего контента (DeepL, scripts/translate-sanity.ts)
```

Lint/test нет. Astro-конфиг вынесен в `config/astro.config.mjs` (уже в npm-скриптах).

## Архитектура

- **Контракт данных** (имена полей Sanity + GROQ): `CONTRACT.md` — единый источник правды.
  Studio и фронт обязаны совпадать. Менять только синхронно.
- **Локализация**: объект `{ en, ru }`. Fallback `value[lang] || value.en || ''`.
  Хелперы — `src/lib/i18n-helpers.ts` (`getLocalized`, `getLocalizedBlocks`, `getLangStaticPaths`, `langPrefix`).
- **GROQ-запросы и типы**: `src/lib/sanity.ts`.
- **Studio-фишки** (`studio/`): кнопка «Перевести» (RU→EN) и «Publish all» в тулбаре,
  тогглы EN/RU скрывают языковые поля, уменьшенные отступы формы.
  Перевод: `studio/actions/translateAction.tsx`. Прокси DeepL — общий между проектами
  (`https://deepl.nomusicians.com/translate`, ключ `SANITY_STUDIO_DEEPL_PROXY_KEY`).

## Sanity

- projectId: `29k7vl30`, dataset: `production` (public).
- Документы: `siteSettings` (Hero, singleton), `seoSettings` (SEO, singleton),
  `aboutSection` (About, singleton), `section` (произвольные разделы, orderable),
  `contactSettings` (Контакты, singleton).
- `.env` обязателен (см. `.env.example`). НЕ коммитить — в `.gitignore`.

## Деплой

- **Sanity Studio** — задеплоена: https://sergeyphilippov.sanity.studio/.
  Авто-деплой при push в `main` с изменениями `studio/**` (GitHub Actions
  `.github/workflows/deploy-sanity.yml`, секреты `SANITY_AUTH_TOKEN` (роль deploy-studio) +
  `SANITY_STUDIO_DEEPL_PROXY_KEY`). Ручной запуск: `gh workflow run deploy-sanity.yml`.
  Локальный деплой: `cd studio && npx sanity deploy`.
- **Сайт (Astro)** — задеплоен на собственный VPS **Чебурашка** (RU), IP `185.228.235.152`,
  домен **sergeyphilippovmusic.com**. Раздаётся **nginx** из докрута `/var/www/sergeyphilippovmusic`
  (чистая статика). Сайт совмещает роль «сайта-прикрытия» VPN-узла (на голом IP отдаётся настоящее портфолио).
  Авто-деплой: push в `main` (кроме `studio/**`) + вебхук Sanity (`repository_dispatch: sanity-content-update`)
  → GitHub Actions `.github/workflows/deploy-vps.yml` (сборка → `rsync dist/` на VPS → `nginx -t && reload`).
  Секреты: `VPS_SSH_KEY` (отдельный deploy-ключ), `VPS_HOST`, `VPS_USER`. Билд **токенлес** (публичный
  датасет Sanity, без секретов). Ручной запуск: `gh workflow run deploy-vps.yml`.
  `base: '/'` (корневой домен). Подробности, откат, DNS/Cloudflare — **`docs/deploy.md`**.
  GitHub Pages ретайрнут (был временным; воркфлоу и публикация удалены).

Прим.: кнопка «Перевести» работает и локально, и на хостинговой Studio
(её origin добавлен в аллоулист общего DeepL-прокси).

## Язык

Весь видимый пользователю текст и коммиты — на русском. Conventional commits.
