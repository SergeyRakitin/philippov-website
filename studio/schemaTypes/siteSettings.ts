import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Главная',
  type: 'document',
  icon: () => '🏠',
  fields: [
    defineField({name: 'name', title: 'Имя', type: 'localeString'}),
    defineField({
      name: 'role',
      title: 'Роль (подзаголовок)',
      type: 'localeString',
      description: 'Например: Theatre Composer & Sound Designer',
    }),
    defineField({name: 'heroTagline', title: 'Вступительный текст', type: 'localeText'}),
    defineField({
      name: 'statusNote',
      title: 'Статус (опц.)',
      type: 'localeString',
      description: 'Например: UK Global Talent Visa Holder',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero-фото',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'backgroundMusic',
      title: 'Фоновая музыка (MP3)',
      type: 'file',
      description: 'Трек, который запускается при открытии сайта. Без файла плеер скрыт.',
      options: {accept: 'audio/mpeg,.mp3'},
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Главная', media: () => '🏠'}
    },
  },
})
