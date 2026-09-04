import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { SUPPORTED_CODES } from './languages';

import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ln from './locales/ln.json';
import de from './locales/de.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import sw from './locales/sw.json';
import ar from './locales/ar.json';

export const STORAGE_KEY = 'tmt_lang';

const resources = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ja: { translation: ja },
  ln: { translation: ln },
  de: { translation: de },
  it: { translation: it },
  nl: { translation: nl },
  zh: { translation: zh },
  ko: { translation: ko },
  ru: { translation: ru },
  sw: { translation: sw },
  ar: { translation: ar },
};

export function detectDeviceLanguage(): string {
  try {
    const code = navigator.language?.split('-')[0];
    if (code && SUPPORTED_CODES.includes(code)) return code;
  } catch { /* ignore */ }
  return 'pt';
}

export function getStoredLanguage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && SUPPORTED_CODES.includes(stored) ? stored : null;
  } catch { return null; }
}

const RTL_CODES = ['ar'];

export function setDocumentLanguage(code: string): void {
  document.documentElement.lang = code;
  document.documentElement.dir = RTL_CODES.includes(code) ? 'rtl' : 'ltr';
}

export function setLanguage(code: string): void {
  if (!SUPPORTED_CODES.includes(code)) return;
  i18n.changeLanguage(code);
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  setDocumentLanguage(code);
}

export function initI18n(): typeof i18n {
  if (i18n.isInitialized) return i18n;
  const stored = getStoredLanguage();
  i18n.use(initReactI18next).init({
    resources,
    lng: stored ?? detectDeviceLanguage(),
    fallbackLng: 'pt',
    returnNull: false,
    interpolation: { escapeValue: false },
  });
  setDocumentLanguage(i18n.language?.split('-')[0] ?? 'pt');
  return i18n;
}

export { i18n };
