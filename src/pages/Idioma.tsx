import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { useLanguage } from "@/hooks/useLanguage";
import { Check } from "lucide-react";

export default function Idioma() {
  const { t } = useTranslation();
  const { current, languages, setCode } = useLanguage();

  return (
    <Layout title={t("language.title")}>
      <div className="space-y-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setCode(lang.code)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="flex-1 font-medium">{lang.nativeName}</span>
            {current.code === lang.code && <Check className="h-5 w-5 text-primary" />}
          </button>
        ))}
      </div>
    </Layout>
  );
}
