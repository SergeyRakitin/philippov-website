import React from 'react'
import {createGlobalStyle} from 'styled-components'

// Уменьшаем вертикальные отступы между полями формы документа.
const DocumentFormSpacingStyle = createGlobalStyle`
  [data-doc-form-root] > [data-ui="Stack"] {
    grid-gap: 16px !important;
  }
  [data-doc-object-input] > [data-ui="Stack"] {
    grid-gap: 16px !important;
  }
`

export function DocumentFormSpacing(): JSX.Element {
  return <DocumentFormSpacingStyle />
}
