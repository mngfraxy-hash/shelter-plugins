import en from '../../i18n/en.json' with { type: 'json' }
import id from '../../i18n/id.json' with { type: 'json' }
import ru from '../../i18n/ru.json' with { type: 'json' }
import fr from '../../i18n/fr.json' with { type: 'json' }

// Global window types for translations
declare global {
  interface Window {
    __DORION_LANG?: string
    __DORION_TRANSLATIONS?: {
      [key: string]: Record<string, unknown>
    }
  }
}

const languages: {
  [key: string]: Record<string, unknown>
} = {
  en,
  id,
  ru,
  fr,
}

export const initializeTranslations = () => {
  try {
    // 'auto' (or missing) follows the system language, otherwise the user's choice in the settings
    // @ts-expect-error config is set by Dorion's preinject before shelter loads
    const chosen: string | undefined = window.__DORION_CONFIG__?.language
    const browserLang = navigator.language?.split('-')[0] || 'en'
    const lang = chosen && chosen !== 'auto' ? chosen : browserLang
    window.__DORION_LANG = languages[lang] ? lang : 'en'
    window.__DORION_TRANSLATIONS = languages
    console.log(`[Dorion Helpers] Initialized translations for language: ${window.__DORION_LANG}`)
  } catch (error) {
    console.warn('[Dorion Helpers] Failed to initialize translations, falling back to English:', error)
    window.__DORION_LANG = 'en'
    window.__DORION_TRANSLATIONS = languages
  }
}
