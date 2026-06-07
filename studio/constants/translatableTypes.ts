// Типы документов, которые можно переводить кнопкой «Перевести» (RU → EN).
export const translatableTypes = [
  'siteSettings',
  'seoSettings',
  'aboutSection',
  'contactSettings',
  'section',
]

// Singleton-документы: documentId совпадает с именем типа,
// открываются напрямую из URL вида /structure/siteSettings (без id=...;type=...).
export const singletonDocumentIds = [
  'siteSettings',
  'seoSettings',
  'aboutSection',
  'contactSettings',
]
