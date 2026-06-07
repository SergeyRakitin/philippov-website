import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'contactSettings',
  title: 'Контакты',
  type: 'document',
  icon: () => '📞',
  fields: [
    defineField({
      name: 'heading',
      title: 'Заголовок',
      type: 'localeString',
      description: 'Например: Contact',
    }),
    defineField({
      name: 'email',
      title: 'E-mail',
      type: 'string',
      validation: (Rule) => Rule.email(),
    }),
    defineField({name: 'phone', title: 'Телефон (опц.)', type: 'string'}),
    defineField({
      name: 'telegram',
      title: 'Telegram (опц.)',
      type: 'string',
      description: 'Юзернейм (@name) или ссылка t.me/...',
    }),
    defineField({
      name: 'availabilityNote',
      title: 'Сопровождающий текст',
      type: 'localeText',
      description: 'Короткий абзац рядом с заголовком (опц.)',
    }),
    defineField({
      name: 'socials',
      title: 'Соцсети / стриминг',
      type: 'array',
      of: [{type: 'socialLink'}],
    }),
  ],
  preview: {
    select: {title: 'heading.en', email: 'email'},
    prepare({title, email}) {
      return {title: title || 'Контакты', subtitle: email, media: () => '📞'}
    },
  },
})
