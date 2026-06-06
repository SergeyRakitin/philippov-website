// UI-строки интерфейса сайта.
// Контент (имя, биография, разделы, контакты) — целиком в Sanity CMS.
// Здесь только интерфейсные строки: навигация, подписи секций, aria-метки карусели и т.п.
// 2 языка: EN (по умолчанию/источник) и RU (перевод).

export const languages = {
  en: 'English',
  ru: 'Русский',
} as const;

export const defaultLang: Lang = 'en';

export const translations = {
  en: {
    // Навигация
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.siteNavigation': 'Site navigation',
    'nav.language': 'Language',

    // Бургер-меню
    'menu.open': 'Menu',
    'menu.close': 'Close menu',

    // Секции
    'section.work': 'Selected Work',

    // Медиа
    'media.listen': 'Listen',
    'media.watch': 'Watch',
    'media.open': 'Open',
    'media.video': 'Video',
    'media.audio': 'Audio',

    // Карусель (aria)
    'carousel.prev': 'Previous photo',
    'carousel.next': 'Next photo',
    'carousel.photo': 'Photo',

    // Контакты
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.location': 'Based in',
    'contact.write': 'Get in touch',

    // Доступность
    'a11y.skipToContent': 'Skip to content',
    'a11y.toTop': 'Back to top',

    // Подвал
    'footer.rights': 'All rights reserved',

    // 404
    '404.title': 'Page not found',
    '404.text': 'The page may have been moved or deleted.',
    '404.back': 'Back to home',

    // Meta
    'meta.defaultDescription': 'Theatre composer and sound designer — portfolio, scores and selected work.',
  },

  ru: {
    // Навигация
    'nav.about': 'О себе',
    'nav.contact': 'Контакты',
    'nav.siteNavigation': 'Навигация по сайту',
    'nav.language': 'Язык',

    // Бургер-меню
    'menu.open': 'Меню',
    'menu.close': 'Закрыть меню',

    // Секции
    'section.work': 'Избранные работы',

    // Медиа
    'media.listen': 'Слушать',
    'media.watch': 'Смотреть',
    'media.open': 'Открыть',
    'media.video': 'Видео',
    'media.audio': 'Аудио',

    // Карусель (aria)
    'carousel.prev': 'Предыдущее фото',
    'carousel.next': 'Следующее фото',
    'carousel.photo': 'Фото',

    // Контакты
    'contact.email': 'Email',
    'contact.phone': 'Телефон',
    'contact.location': 'Базируется в',
    'contact.write': 'Связаться',

    // Доступность
    'a11y.skipToContent': 'Перейти к содержимому',
    'a11y.toTop': 'Наверх',

    // Подвал
    'footer.rights': 'Все права защищены',

    // 404
    '404.title': 'Страница не найдена',
    '404.text': 'Возможно, она была перемещена или удалена.',
    '404.back': 'На главную',

    // Meta
    'meta.defaultDescription': 'Театральный композитор и саунд-дизайнер — портфолио, партитуры и избранные работы.',
  },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations['en'];

/** UI-строка с fallback на EN (источник). */
export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang]?.[key] || translations.en[key] || '';
}

/** Определить язык из URL-пути (RU — с префиксом /ru, EN — без). */
export function getLangFromUrl(url: URL): Lang {
  const [, seg] = url.pathname.split('/');
  if (seg in translations) return seg as Lang;
  return defaultLang;
}

// Проверка консистентности наборов ключей EN/RU при сборке.
function assertTranslations(): void {
  const baseKeys = Object.keys(translations.en);
  (Object.keys(translations) as Lang[]).forEach((lang) => {
    const langKeys = Object.keys(translations[lang]);
    baseKeys.forEach((key) => {
      const value = translations[lang][key as TranslationKey];
      if (!value || value.trim().length === 0) {
        throw new Error(`[i18n] Пустой перевод для ${lang}.${key}`);
      }
    });
    langKeys.forEach((key) => {
      if (!baseKeys.includes(key)) {
        throw new Error(`[i18n] Лишний ключ в ${lang}: ${key}`);
      }
    });
  });
}

assertTranslations();
