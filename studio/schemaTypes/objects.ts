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
    defineField({name: 'title', title: 'Заголовок', type: 'localeString'}),
  ],
  preview: {
    select: {title: 'title.en', url: 'url'},
    prepare({title, url}) {
      return {title: title || 'Видео', subtitle: url}
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'title', title: 'Заголовок', type: 'localeString'}),
  ],
  preview: {
    select: {title: 'title.en', url: 'url'},
    prepare({title, url}) {
      return {title: title || 'Аудио', subtitle: url}
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
