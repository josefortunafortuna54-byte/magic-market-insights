import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("admin.search")}
        className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("admin.clearSearch")}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
