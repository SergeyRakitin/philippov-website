/// <reference types="astro/client" />

// Типы переменных окружения (Sanity). EN — источник, RU — перевод.
interface ImportMetaEnv {
  readonly SANITY_PROJECT_ID?: string;
  readonly SANITY_DATASET?: string;
  readonly SANITY_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
