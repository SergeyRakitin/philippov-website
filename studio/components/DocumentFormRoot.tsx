import React from 'react'
import type {InputProps} from 'sanity'
import {Box} from '@sanity/ui'

export function DocumentFormRoot(props: InputProps): JSX.Element {
  if (props.id === 'root') {
    return <Box data-doc-form-root>{props.renderDefault(props)}</Box>
  }

  if (props.schemaType?.jsonType === 'object' && props.id !== 'root') {
    return <Box data-doc-object-input>{props.renderDefault(props)}</Box>
  }

  return props.renderDefault(props)
}
