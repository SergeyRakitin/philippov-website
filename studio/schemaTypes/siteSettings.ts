import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Hero / Главная',
  type: 'document',
  icon: () => '🏠',
  groups: [
    {name: 'hero', title: 'Hero', default: true},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({name: 'name', title: 'Имя', type: 'localeString', group: 'hero'}),
    defineField({
      name: 'role',
      title: 'Роль (подзаголовок)',
      type: 'localeString',
      group: 'hero',
      description: 'Например: Theatre Composer & Sound Designer',
    }),
    defineField({name: 'heroTagline', title: 'Вступительный текст', type: 'localeText', group: 'hero'}),
    defineField({
      name: 'statusNote',
      title: 'Статус (опц.)',
      type: 'localeString',
      group: 'hero',
      description: 'Например: UK Global Talent Visa Holder',
    }),
    defineField({
      name: 'heroImage',
      title: 'Фоновое фото / портрет',
      type: 'image',
      options: {hotspot: true},
      group: 'hero',
    }),
    defineField({name: 'seoTitle', title: 'SEO Title', type: 'localeString', group: 'seo'}),
    defineField({name: 'seoDescription', title: 'SEO Description', type: 'localeText', group: 'seo'}),
    defineField({name: 'ogImage', title: 'OG-картинка (соцсети)', type: 'image', group: 'seo'}),
  ],
  preview: {
    select: {title: 'name.en'},
    prepare({title}) {
      return {title: title || 'Hero / Главная', media: () => '🏠'}
    },
  },
})
