import cs from './cs.json' with { type: 'json' }
import en from './en.json' with { type: 'json' }

export type Language = 'en' | 'cs'
export type MessageKey = keyof typeof en

const dictionaries: Record<Language, Record<MessageKey, string>> = { en, cs }

export function browserLanguage(
  preferences: readonly string[] | undefined,
  primary: string,
): Language {
  for (const preference of preferences?.length ? preferences : [primary]) {
    const language = preference.toLowerCase().split('-')[0]
    if (language === 'en' || language === 'cs') return language
  }

  return 'en'
}

export function translate(
  language: Language,
  key: MessageKey,
  values: Record<string, string | number> = {},
): string {
  return dictionaries[language][key].replaceAll(/\{([a-z]+)\}/gi, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  )
}
