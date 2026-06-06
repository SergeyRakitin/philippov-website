// Типы переменных окружения для Studio (Vite/Sanity).
// SANITY_STUDIO_* подхватываются Vite на клиенте через import.meta.env.
// Файл без import/export — иначе глобальное расширение ImportMeta не применится.
interface ImportMetaEnv {
  readonly SANITY_STUDIO_PROJECT_ID?: string
  readonly SANITY_STUDIO_DATASET?: string
  readonly SANITY_STUDIO_DEEPL_PROXY_URL?: string
  readonly SANITY_STUDIO_DEEPL_PROXY_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
