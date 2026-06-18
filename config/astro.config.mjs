// Конфигурация Astro — генерация статического сайта из данных Sanity.
// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  // Хостинг на собственном VPS (Чебурашка, nginx) под доменом sergeyphilippovmusic.com.
  // Корневой путь — ассеты отдаются с `/`, не из подпапки.
  site: 'https://sergeyphilippovmusic.com',
  base: '/',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ru: 'ru' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['localhost', '.ngrok-free.dev', '.ngrok.io', '.loca.lt'],
    },
  },
});
