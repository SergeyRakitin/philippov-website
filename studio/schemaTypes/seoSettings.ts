import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'seoSettings',
  title: 'SEO',
  type: 'document',
  icon: () => '🔍',
  fields: [
    defineField({name: 'seoTitle', title: 'SEO Title', type: 'localeString'}),
    defineField({name: 'seoDescription', title: 'SEO Description', type: 'localeText'}),
    defineField({name: 'ogImage', title: 'OG-картинка (соцсети)', type: 'image'}),
  ],
  preview: {
    prepare() {
      return {title: 'SEO', media: () => '🔍'}
    },
  },
})
