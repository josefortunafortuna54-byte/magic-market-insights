import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkActionsBar({ selectedCount, onDelete, onCancel }: BulkActionsBarProps) {
  const { t } = useTranslation();
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-border bg-card/90 px-4 py-3 backdrop-blur-xl">
      <p className="text-sm font-semibold">{t("admin.selectedCount", { count: selectedCount })}</p>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          {t("admin.deleteSelected")}
        </Button>
      </div>
    </div>
  );
}
