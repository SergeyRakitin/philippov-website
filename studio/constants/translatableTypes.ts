// Типы документов, которые можно переводить кнопкой «Перевести» (EN → RU).
export const translatableTypes = [
  'siteSettings',
  'aboutSection',
  'contactSettings',
  'section',
]

// Singleton-документы: documentId совпадает с именем типа,
// открываются напрямую из URL вида /structure/siteSettings (без id=...;type=...).
export const singletonDocumentIds = [
  'siteSettings',
  'aboutSection',
  'contactSettings',
]
