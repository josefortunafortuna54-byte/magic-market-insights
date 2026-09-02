import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { SUPPORTED_CODES } from './languages';

export const STORAGE_KEY = 'app_language';

const resources = {
  pt: { translation: require('./locales/pt.json') },
  en: { translation: require('./locales/en.json') },
  es: { translation: require('./locales/es.json') },
  fr: { translation: require('./locales/fr.json') },
  ja: { translation: require('./locales/ja.json') },
  ln: { translation: require('./locales/ln.json') },
  de: { translation: require('./locales/de.json') },
  it: { translation: require('./locales/it.json') },
  nl: { translation: require('./locales/nl.json') },
  zh: { translation: require('./locales/zh.json') },
  ko: { translation: require('./locales/ko.json') },
  ru: { translation: require('./locales/ru.json') },
  sw: { translation: require('./locales/sw.json') },
  ar: { translation: require('./locales/ar.json') },
};

export function detectDeviceLanguage(): string {
  try {
    const code = getLocales()[0]?.languageCode ?? null;
    if (code && SUPPORTED_CODES.includes(code)) return code;
  } catch {
    // ignore
  }
  return 'pt';
}

export function initI18n(): typeof i18n {
  if (i18n.isInitialized) return i18n;
  i18n.use(initReactI18next).init({
    resources,
    lng: detectDeviceLanguage(),
    fallbackLng: 'pt',
    returnNull: false,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

export { i18n };

export async function getStoredLanguage(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored && SUPPORTED_CODES.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

export async function setLanguage(code: string): Promise<void> {
  if (!SUPPORTED_CODES.includes(code)) return;
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    // ignore
  }
}
