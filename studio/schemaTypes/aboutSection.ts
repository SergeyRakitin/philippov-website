import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'aboutSection',
  title: 'О себе',
  type: 'document',
  icon: () => '📄',
  fields: [
    defineField({
      name: 'heading',
      title: 'Заголовок',
      type: 'localeString',
      description: 'Например: About',
    }),
    defineField({name: 'body', title: 'Текст (rich text)', type: 'localeRichText'}),
    defineField({
      name: 'portrait',
      title: 'Портрет (опц.)',
      type: 'image',
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {title: 'heading.en'},
    prepare({title}) {
      return {title: title || 'О себе', media: () => '📄'}
    },
  },
})
