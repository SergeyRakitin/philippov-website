import {localeString, localeText, localeRichText} from './locale'
import {videoItem, audioItem, socialLink} from './objects'
import siteSettings from './siteSettings'
import seoSettings from './seoSettings'
import aboutSection from './aboutSection'
import section from './section'
import contactSettings from './contactSettings'

export const schemaTypes = [
  // Локализованные object-типы
  localeString,
  localeText,
  localeRichText,
  // Медиа / ссылки
  videoItem,
  audioItem,
  socialLink,
  // Документы
  siteSettings,
  seoSettings,
  aboutSection,
  section,
  contactSettings,
]
