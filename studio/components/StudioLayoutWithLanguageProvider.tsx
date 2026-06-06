import React from 'react'
import type {LayoutProps} from 'sanity'

import {DocumentFormSpacing} from './DocumentFormSpacing'
import {LanguageVisibilityProvider} from './languageVisibility'

export function StudioLayoutWithLanguageProvider(props: LayoutProps): JSX.Element {
  return (
    <LanguageVisibilityProvider>
      <DocumentFormSpacing />
      {props.renderDefault(props)}
    </LanguageVisibilityProvider>
  )
}
