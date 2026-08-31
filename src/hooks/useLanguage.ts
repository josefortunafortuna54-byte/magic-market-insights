import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, type Language } from "@/lib/i18n/languages";
import { setLanguage as persistLanguage } from "@/lib/i18n";

export function useLanguage() {
  const { i18n } = useTranslation();
  const currentCode = (i18n.language?.split('-')[0] ?? 'pt') as string;
  const current = LANGUAGES.find((l) => l.code === currentCode) ?? LANGUAGES[0];

  const setCode = useCallback((code: string) => {
    persistLanguage(code);
  }, []);

  return { current, currentCode, languages: LANGUAGES, setCode } as const;
}
