import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ExportColumn {
  key: string;
  label: string;
}

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: ExportColumn[];
  label?: string;
}

function convertToCSV(data: Record<string, unknown>[], columns: ExportColumn[]): string {
  const headers = columns.map((c) => c.label).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        const str = val == null ? "" : String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(","),
  );
  return [headers, ...rows].join("\n");
}

export function ExportButton({ data, filename, columns, label }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (data.length === 0) {
      toast.error("Erro ao exportar");
      return;
    }
    setExporting(true);
    try {
      const csv = convertToCSV(data, columns);
      const date = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}_${date}.csv`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fullFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${label ?? "Exportar sinais"} (${fullFilename})`);
    } catch {
      toast.error("Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={exporting}>
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {exporting ? "A exportar…" : (label ?? "Exportar sinais")}
    </Button>
  );
}
