import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const MODES = [
  { value: "system" as const, icon: Monitor, key: "theme.system" },
  { value: "dark" as const, icon: Moon, key: "theme.dark" },
  { value: "light" as const, icon: Sun, key: "theme.light" },
] as const;

const STORAGE_KEY = "tmt_theme";

export default function Tema() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setTheme(stored);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = mounted ? (theme ?? "system") : "system";

  const handleSet = (value: string) => {
    setTheme(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  };

  return (
    <Layout title={t("theme.title")}>
      <div className="space-y-3">
        {MODES.map(({ value, icon: Icon, key }) => (
          <button
            key={value}
            onClick={() => handleSet(value)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 font-medium">{t(key)}</span>
            {current === value && <Check className="h-5 w-5 text-primary" />}
          </button>
        ))}
      </div>
    </Layout>
  );
}
