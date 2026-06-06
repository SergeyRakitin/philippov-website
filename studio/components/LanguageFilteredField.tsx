import React from 'react'
import type {FieldProps} from 'sanity'

import {useLanguageVisibility} from './languageVisibility'

type LanguageKey = 'en' | 'ru'

function getLanguageFromFieldName(name: string): LanguageKey | null {
  if (name === 'en' || name === 'ru') return name
  return null
}

export function LanguageFilteredField(props: FieldProps): JSX.Element | null {
  const {visibility} = useLanguageVisibility()
  const lang = getLanguageFromFieldName(props.name)

  const schemaType = props.schemaType
  const isLocalizedObject =
    schemaType?.jsonType === 'object' &&
    Array.isArray(schemaType?.fields) &&
    schemaType.fields.some((field) => field.name === 'en') &&
    schemaType.fields.some((field) => field.name === 'ru')

  // Оба языка скрыты — прячем весь локализованный объект.
  if (isLocalizedObject && !visibility.en && !visibility.ru) {
    return null
  }

  // Скрываем конкретное языковое подполе.
  if (lang && !visibility[lang]) {
    return null
  }

  return props.renderDefault(props)
}
