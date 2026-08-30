import { useState } from "react";
import { Zap, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as adminApi from "@/lib/adminApi";
import { useAdminSearch } from "@/hooks/useAdminSearch";
import { SearchBar } from "@/components/admin/SearchBar";
import { FilterChips } from "@/components/admin/FilterChips";
import { ExportButton } from "@/components/admin/ExportButton";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";

interface BoomHourRow {
  id: string;
  title: string;
  time_gmt: string;
  time_wat: string;
  days?: string;
  pairs?: string[];
  volatility?: number | string;
  badge?: string;
}

interface Props {
  boomHours: Record<string, unknown>[];
  onRefresh: () => Promise<void>;
}

const VOL_FILTERS = [
  { key: "vol1", label: "Vol 1", value: "1" },
  { key: "vol2", label: "Vol 2", value: "2" },
  { key: "vol3", label: "Vol 3", value: "3" },
  { key: "vol4", label: "Vol 4", value: "4" },
  { key: "vol5", label: "Vol 5", value: "5" },
];

export function AdminBoomHoursTab({ boomHours, onRefresh }: Props) {
  const [form, setForm] = useState({
    title: "", time_gmt: "", time_wat: "", pairs: "", days: "", description: "", volatility: "4", badge: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: boomHours,
    searchFields: ["title"],
    filterConfig: VOL_FILTERS,
    filterField: "volatility",
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const filteredIds = filteredData.map((b) => (b as unknown as BoomHourRow).id);
    if (selectedIds.length === filteredIds.length && filteredIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Apagar ${selectedIds.length} horários selecionados?`)) return;
    try {
      await adminApi.bulkDeleteBoomHours(selectedIds);
      toast.success("Horários apagados");
      setSelectedIds([]);
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao apagar horários");
    }
  };

  const addBoomHour = async () => {
    if (!form.title || !form.time_gmt || !form.time_wat) { alert("Preenche os campos obrigatórios!"); return; }
    const pairs = form.pairs.split(",").map(p => p.trim()).filter(Boolean);
    try {
      await adminApi.addBoomHour({
        title: form.title, time_gmt: form.time_gmt, time_wat: form.time_wat,
        pairs, days: form.days || "", description: form.description,
        volatility: Number(form.volatility), badge: form.badge,
      });
      alert("✅ Hora do Boom adicionada!");
      setForm({ title: "", time_gmt: "", time_wat: "", pairs: "", days: "", description: "", volatility: "4", badge: "" });
      await onRefresh();
    } catch (e: unknown) { alert("Erro: " + (e instanceof Error ? e.message : e)); }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 max-w-lg">
        <h2 className="font-display text-lg font-bold mb-6 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> Adicionar Hora do Boom
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Londres + Nova Iorque" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hora GMT *</label>
              <input value={form.time_gmt} onChange={e => setForm({...form, time_gmt: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="13:00 – 17:00" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hora WAT *</label>
              <input value={form.time_wat} onChange={e => setForm({...form, time_wat: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="14:00 – 18:00" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pares (separados por vírgula)</label>
            <input value={form.pairs} onChange={e => setForm({...form, pairs: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="EURUSD,XAUUSD,BTCUSD" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dias (opcional)</label>
            <input value={form.days} onChange={e => setForm({...form, days: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="Seg,Qua" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Volatilidade (1-5)</label>
              <input type="number" min="1" max="5" value={form.volatility}
                onChange={e => setForm({...form, volatility: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Badge (opcional)</label>
              <input value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="Melhor Período" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none"
              placeholder="Descreve este período de Hora do Boom..." />
          </div>
          <button onClick={addBoomHour}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90">
            Publicar Hora do Boom
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold">Boom Hours ({filteredData.length})</h3>
            <ExportButton
              label="Exportar horários"
              filename="boom-hours"
              data={filteredData}
              columns={[
                { key: "title", label: "Título" },
                { key: "time_gmt", label: "GMT" },
                { key: "time_wat", label: "WAT" },
                { key: "days", label: "Dias" },
                { key: "pairs", label: "Pares" },
                { key: "volatility", label: "Volatilidade" },
                { key: "badge", label: "Badge" },
              ]}
            />
          </div>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Pesquisar horários..." />
          <FilterChips
            filters={VOL_FILTERS}
            activeFilters={activeFilters}
            onToggle={toggleFilter}
            onClear={clearFilters}
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === filteredData.length}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              {["Título","GMT","WAT","Dias","Pares","Ações"].map(h => (
                <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((raw) => {
              const b = raw as unknown as BoomHourRow;
              return (
                <tr key={b.id} className={`border-b border-border/30 hover:bg-secondary/20 ${selectedIds.includes(b.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(b.id)}
                      onChange={() => toggleSelect(b.id)}
                      aria-label={`Selecionar ${b.title}`}
                    />
                  </td>
                  <td className="p-3 font-semibold">{b.title}</td>
                  <td className="p-3 font-mono text-xs">{b.time_gmt}</td>
                  <td className="p-3 font-mono text-xs">{b.time_wat}</td>
                  <td className="p-3 text-xs text-muted-foreground">{b.days || "Todos"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{b.pairs?.join(", ")}</td>
                  <td className="p-3">
                    <button onClick={async () => {
                      if (!confirm("Apagar?")) return;
                      try { await adminApi.deleteBoomHour(b.id); } catch (e: unknown) { alert("Erro: " + (e instanceof Error ? e.message : e)); }
                      await onRefresh();
                    }} className="text-destructive hover:opacity-70">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Sem horários.</p>
        )}
      </div>

      <BulkActionsBar
        selectedCount={selectedIds.length}
        onDelete={() => void handleBulkDelete()}
        onCancel={() => setSelectedIds([])}
      />
    </div>
  );
}
