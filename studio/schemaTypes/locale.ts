import {defineType, defineField} from 'sanity'

// Локализованная строка { en, ru }. RU — язык ввода, EN — переведённая цель + база фронтового fallback.
export const localeString = defineType({
  name: 'localeString',
  title: 'Локализованная строка',
  type: 'object',
  fields: [
    defineField({name: 'ru', title: 'RU', type: 'string'}),
    defineField({name: 'en', title: 'EN', type: 'string'}),
  ],
})

// Локализованный многострочный текст { en, ru }. RU — язык ввода, EN — переведённая цель.
export const localeText = defineType({
  name: 'localeText',
  title: 'Локализованный текст',
  type: 'object',
  fields: [
    defineField({name: 'ru', title: 'RU', type: 'text', rows: 3}),
    defineField({name: 'en', title: 'EN', type: 'text', rows: 3}),
  ],
})

// Локализованный rich text (Portable Text) { en, ru }. RU — язык ввода, EN — переведённая цель.
const blockArray = {
  type: 'array' as const,
  of: [
    {
      type: 'block' as const,
      styles: [
        {title: 'Обычный', value: 'normal'},
        {title: 'Заголовок', value: 'h3'},
        {title: 'Подзаголовок', value: 'h4'},
        {title: 'Цитата', value: 'blockquote'},
      ],
      lists: [
        {title: 'Маркированный', value: 'bullet'},
        {title: 'Нумерованный', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Жирный', value: 'strong'},
          {title: 'Курсив', value: 'em'},
          {title: 'Подчёркнутый', value: 'underline'},
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Ссылка',
            fields: [{name: 'href', type: 'url', title: 'URL'}],
          },
        ],
      },
    },
  ],
}

export const localeRichText = defineType({
  name: 'localeRichText',
  title: 'Локализованный rich text',
  type: 'object',
  fields: [
    defineField({name: 'ru', title: 'RU', ...blockArray}),
    defineField({name: 'en', title: 'EN', ...blockArray}),
  ],
})
