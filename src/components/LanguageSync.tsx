import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getStoredLanguage, STORAGE_KEY, setDocumentLanguage } from "@/lib/i18n";

export function LanguageSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored && stored !== i18n.language) {
      i18n.changeLanguage(stored);
    }
    setDocumentLanguage(i18n.language?.split('-')[0] ?? 'pt');
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      i18n.changeLanguage(e.newValue);
      setDocumentLanguage(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    const onLanguageChanged = (lng: string) => setDocumentLanguage(lng.split('-')[0]);
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [i18n]);
  return null;
}
