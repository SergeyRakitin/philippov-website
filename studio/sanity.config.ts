// Sanity Studio — портфолио Сергея Филиппова.
import {defineConfig, definePlugin} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
import {schemaTypes} from './schemaTypes'
import {TranslateAction} from './actions/translateAction'
import {LanguageFilteredField} from './components/LanguageFilteredField'
import {DocumentFormRoot} from './components/DocumentFormRoot'
import {StudioLayoutWithLanguageProvider} from './components/StudioLayoutWithLanguageProvider'
import {StudioNavbarWithLanguageFilter} from './components/StudioNavbarWithLanguageFilter'
import {translatableTypes} from './constants/translatableTypes'

const languageVisibilityPlugin = definePlugin({
  name: 'language-visibility',
  studio: {
    components: {
      layout: StudioLayoutWithLanguageProvider,
      navbar: StudioNavbarWithLanguageFilter,
    },
  },
})

export default defineConfig({
  name: 'philippov',
  title: 'Sergey Philippov',

  projectId: import.meta.env.SANITY_STUDIO_PROJECT_ID || '29k7vl30',
  dataset: import.meta.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    languageVisibilityPlugin(),
    structureTool({
      structure: (S, context) => {
        return S.list()
          .title('Контент')
          .items([
            // === Главная (singleton) ===
            S.listItem()
              .id('siteSettings')
              .title('🏠 Главная')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),

            // === SEO (singleton) ===
            S.listItem()
              .id('seoSettings')
              .title('🔍 SEO')
              .child(S.document().schemaType('seoSettings').documentId('seoSettings')),

            // === О себе (singleton) ===
            S.listItem()
              .id('aboutSection')
              .title('📄 О себе')
              .child(S.document().schemaType('aboutSection').documentId('aboutSection')),

            S.divider(),

            // === Разделы (orderable) ===
            orderableDocumentListDeskItem({
              type: 'section',
              id: 'orderable-section',
              title: '🎼 Разделы',
              icon: () => '🎼',
              S,
              context,
            }),

            S.divider(),

            // === Контакты (singleton) ===
            S.listItem()
              .id('contactSettings')
              .title('📞 Контакты')
              .child(S.document().schemaType('contactSettings').documentId('contactSettings')),
          ])
      },
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, context) => {
      if (translatableTypes.includes(context.schemaType)) {
        const publishIndex = prev.findIndex((action) => action.action === 'publish')
        if (publishIndex === -1) return [...prev, TranslateAction]
        return [...prev.slice(0, publishIndex + 1), TranslateAction, ...prev.slice(publishIndex + 1)]
      }
      return prev
    },
  },
  form: {
    components: {
      input: DocumentFormRoot,
      field: LanguageFilteredField,
    },
  },
})
