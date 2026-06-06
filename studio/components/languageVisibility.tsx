import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react'

export type LanguageKey = 'en' | 'ru'

export type LanguageVisibility = Record<LanguageKey, boolean>

const STORAGE_KEY = 'philippov.languageVisibility'

// EN — язык по умолчанию (источник), показываем его; RU скрыт до явного включения.
const DEFAULT_VISIBILITY: LanguageVisibility = {
  en: true,
  ru: false,
}

function normalizeVisibility(input: unknown): LanguageVisibility {
  const raw = input && typeof input === 'object' ? (input as Partial<LanguageVisibility>) : {}
  return {
    en: raw.en === undefined ? true : Boolean(raw.en),
    ru: Boolean(raw.ru),
  }
}

export function getVisibleLangs(): LanguageVisibility {
  if (typeof window === 'undefined') return DEFAULT_VISIBILITY
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_VISIBILITY
    return normalizeVisibility(JSON.parse(stored))
  } catch {
    return DEFAULT_VISIBILITY
  }
}

export function setVisibleLangs(next: LanguageVisibility): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeVisibility(next)))
  } catch {
    // Игнорируем ошибки хранилища (например, приватный режим)
  }
}

type LanguageVisibilityContextValue = {
  visibility: LanguageVisibility
  setVisibility: (next: LanguageVisibility) => void
}

const LanguageVisibilityContext = createContext<LanguageVisibilityContextValue | null>(null)

export function LanguageVisibilityProvider({children}: {children: React.ReactNode}): JSX.Element {
  const [visibility, setVisibilityState] = useState<LanguageVisibility>(DEFAULT_VISIBILITY)

  useEffect(() => {
    setVisibilityState(getVisibleLangs())
  }, [])

  const setVisibility = useCallback((next: LanguageVisibility) => {
    const normalized = normalizeVisibility(next)
    setVisibilityState(normalized)
    setVisibleLangs(normalized)
  }, [])

  const value = useMemo(() => ({visibility, setVisibility}), [visibility, setVisibility])

  return (
    <LanguageVisibilityContext.Provider value={value}>
      {children}
    </LanguageVisibilityContext.Provider>
  )
}

export function useLanguageVisibility(): LanguageVisibilityContextValue {
  const ctx = useContext(LanguageVisibilityContext)
  if (!ctx) {
    return {
      visibility: DEFAULT_VISIBILITY,
      setVisibility: () => undefined,
    }
  }
  return ctx
}
