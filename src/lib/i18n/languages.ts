export interface Language {
  code: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'pt', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'en', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ja', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ln', nativeName: 'Lingála', flag: '🇨🇩' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'zh', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ko', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'sw', nativeName: 'Kiswahili', flag: '🇹🇿' },
  { code: 'ar', nativeName: 'العربية', flag: '🇸🇦' },
];

export const SUPPORTED_CODES: string[] = LANGUAGES.map((l) => l.code);
