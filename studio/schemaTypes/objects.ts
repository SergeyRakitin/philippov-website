import {defineType, defineField} from 'sanity'

// Видео-ссылка (YouTube / Vimeo / др.)
export const videoItem = defineType({
  name: 'videoItem',
  title: 'Видео',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'Ссылка на видео',
      type: 'url',
      description: 'YouTube, Vimeo и др.',
      validation: (Rule) => Rule.required(),
    }),
    // Старые документы ещё могут содержать это поле.
    defineField({name: 'title', type: 'localeString', hidden: true}),
  ],
  preview: {
    select: {url: 'url'},
    prepare({url}) {
      return {title: url || 'Видео'}
    },
  },
})

// Аудио-ссылка (SoundCloud / Spotify / др.)
export const audioItem = defineType({
  name: 'audioItem',
  title: 'Аудио',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'Ссылка на трек',
      type: 'url',
      description: 'SoundCloud, Spotify и др.',
      validation: (Rule) => Rule.required().uri({scheme: ['http', 'https']}),
    }),
    // Сохраняем совместимость схемы с ранее сохранёнными записями.
    defineField({name: 'file', type: 'file', hidden: true}),
    defineField({name: 'title', type: 'localeString', hidden: true}),
  ],
  preview: {
    select: {url: 'url'},
    prepare({url}) {
      return {title: url || 'Аудио', subtitle: url ? undefined : 'Добавьте ссылку или уберите запись'}
    },
  },
})

// Соцсеть / стриминг
export const socialLink = defineType({
  name: 'socialLink',
  title: 'Соцсеть / стриминг',
  type: 'object',
  fields: [
    defineField({
      name: 'platform',
      title: 'Платформа',
      type: 'string',
      options: {
        list: [
          {title: 'Spotify', value: 'spotify'},
          {title: 'SoundCloud', value: 'soundcloud'},
          {title: 'YouTube', value: 'youtube'},
          {title: 'Instagram', value: 'instagram'},
          {title: 'Telegram', value: 'telegram'},
          {title: 'WhatsApp', value: 'whatsapp'},
          {title: 'Сайт', value: 'website'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Ссылка',
      type: 'url',
      validation: (Rule) => Rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({name: 'label', title: 'Подпись (опц.)', type: 'string'}),
  ],
  preview: {
    select: {platform: 'platform', url: 'url'},
    prepare({platform, url}) {
      return {title: platform || 'Ссылка', subtitle: url}
    },
  },
})
