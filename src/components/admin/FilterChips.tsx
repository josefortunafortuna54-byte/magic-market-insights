import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface FilterChipConfig {
  key: string;
  label: string;
  value: string;
  labelKey?: string;
}

interface FilterChipsProps {
  filters: FilterChipConfig[];
  activeFilters: string[];
  onToggle: (filter: string) => void;
  onClear: () => void;
}

export function FilterChips({ filters, activeFilters, onToggle, onClear }: FilterChipsProps) {
  const { t } = useTranslation();
  if (filters.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {activeFilters.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-border bg-secondary px-3 py-1 text-xs text-destructive"
        >
          {t("admin.clearFilters")}
        </button>
      )}
      {filters.map((filter) => {
        const isActive = activeFilters.includes(filter.value);
        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onToggle(filter.value)}
            className={cn(
              "rounded-lg border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors",
              isActive && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {filter.labelKey ? t(filter.labelKey) : filter.label}
          </button>
        );
      })}
    </div>
  );
}