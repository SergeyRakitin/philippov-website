import {defineType, defineField} from 'sanity'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'

export default defineType({
  name: 'section',
  title: 'Раздел',
  type: 'document',
  icon: () => '🎼',
  fields: [
    defineField({
      name: 'title',
      title: 'Название раздела',
      type: 'localeString',
      description: 'Например: Theatre Music / Sound Design',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Якорь (URL-идентификатор)',
      type: 'slug',
      options: {source: 'title.en', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'subtitle', title: 'Подзаголовок (опц.)', type: 'localeString'}),
    defineField({name: 'body', title: 'Текст (rich text, опц.)', type: 'localeRichText'}),
    defineField({
      name: 'photos',
      title: 'Фотографии (карусель)',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {hotspot: true, crop: true},
          fields: [{name: 'caption', title: 'Подпись', type: 'localeString'}],
        },
      ],
      options: {layout: 'grid'},
    }),
    defineField({
      name: 'videos',
      title: 'Видео',
      type: 'array',
      of: [{type: 'videoItem'}],
    }),
    defineField({
      name: 'audios',
      title: 'Аудио',
      type: 'array',
      of: [{type: 'audioItem'}],
    }),
    defineField({
      name: 'visible',
      title: 'Показывать на сайте',
      type: 'boolean',
      initialValue: true,
    }),
    orderRankField({type: 'section'}),
  ],
  orderings: [orderRankOrdering],
  preview: {
    select: {title: 'title.en', visible: 'visible', photos: 'photos'},
    prepare({title, visible, photos}) {
      const count = Array.isArray(photos) ? photos.length : 0
      return {
        title: `${visible === false ? '🚫 ' : ''}${title || 'Без названия'}`,
        subtitle: count ? `🎼 ${count} фото` : '🎼 Раздел',
        media: () => '🎼',
      }
    },
  },
})
