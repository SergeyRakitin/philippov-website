# Sergey Philippov — портфолио

Сайт-портфолио театрального композитора и саунд-дизайнера Сергея Филиппова.
Одностраничник на **Astro 5 + Sanity CMS + Tailwind 4**, два языка (EN/RU),
автоперевод через DeepL.

## Быстрый старт

```bash
# 1. Зависимости
npm install
cd studio && npm install && cd ..

# 2. Окружение
cp .env.example .env   # заполнить значения (Sanity, DeepL)

# 3. Запуск
npm run dev            # сайт → http://localhost:4322
cd studio && npm run dev   # админка → http://localhost:3333
```

## Структура

```
src/            Astro: страницы, компоненты, lib, i18n, стили
studio/         Sanity Studio: схемы, кастомные компоненты тулбара
scripts/        seed.ts (стартовый контент), translate-sanity.ts (перевод)
config/         astro.config.mjs
CONTRACT.md     контракт данных (поля Sanity ↔ GROQ)
```

## Контент

Весь контент — в Sanity Studio. Структура: Hero, About, произвольные разделы
(Театральная музыка, Саунд-дизайн и т.д.) с текстом / фото-каруселью / видео / аудио,
Контакты. Язык по умолчанию — английский; русский переводится кнопкой «Перевести».

Подробнее для разработчиков и агентов — `CLAUDE.md`.
