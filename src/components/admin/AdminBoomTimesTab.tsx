import { useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as adminApi from "@/lib/adminApi";
import { useAdminSearch } from "@/hooks/useAdminSearch";
import { SearchBar } from "@/components/admin/SearchBar";
import { FilterChips } from "@/components/admin/FilterChips";
import { ExportButton } from "@/components/admin/ExportButton";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";

interface BoomTimeRow {
  id: string;
  pair: string;
  boom_time: string;
  confidence?: number | string;
  result?: string;
}

interface Props {
  boomTimes: Record<string, unknown>[];
  onRefresh: () => Promise<void>;
}

const RESULT_FILTERS = [
  { key: "buy", label: "BUY", value: "BUY" },
  { key: "sell", label: "SELL", value: "SELL" },
  { key: "pending", label: "Pending", value: "" },
];

export function AdminBoomTimesTab({ boomTimes, onRefresh }: Props) {
  const [form, setForm] = useState({ pair: "", boom_time: "", confidence: "75", result: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: boomTimes,
    searchFields: ["pair"],
    filterConfig: RESULT_FILTERS,
    filterField: "result",
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const filteredIds = filteredData.map((b) => (b as unknown as BoomTimeRow).id);
    if (selectedIds.length === filteredIds.length && filteredIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Apagar ${selectedIds.length} boom times selecionados?`)) return;
    try {
      await adminApi.bulkDeleteBoomTimes(selectedIds);
      toast.success("Boom times apagados");
      setSelectedIds([]);
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao apagar boom times");
    }
  };

  const addBoomTime = async () => {
    if (!form.pair || !form.boom_time) { alert("Par e hora obrigatórios!"); return; }
    let image_url = "";
    let audio_url = "";
    try {
      if (imageFile) {
        const clean = imageFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        image_url = await adminApi.uploadFile("posts", `boom/${Date.now()}-${clean}`, imageFile);
      }
      if (audioFile) {
        const clean = audioFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        audio_url = await adminApi.uploadFile("posts", `boom-audio/${Date.now()}-${clean}`, audioFile);
      }
      await adminApi.addBoomTime({
        pair: form.pair, boom_time: new Date(form.boom_time).toISOString(),
        confidence: Number(form.confidence), result: form.result || "", image_url, audio_url,
      });
      alert("✅ Boom publicado!");
      setForm({ pair: "", boom_time: "", confidence: "75", result: "" });
      setImageFile(null); setAudioFile(null);
      await onRefresh();
    } catch (e: unknown) { alert("Erro: " + (e instanceof Error ? e.message : e)); }
  };

  const updateResult = async (id: string, result: string) => {
    try { await adminApi.updateBoomResult(id, result); } catch (e: unknown) { alert("Erro: " + (e instanceof Error ? e.message : e)); }
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 max-w-lg">
        <h2 className="font-display text-lg font-bold mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Novo Boom
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Par *</label>
              <input value={form.pair} onChange={e => setForm({...form, pair: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="XAUUSD" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confiança (%)</label>
              <input type="number" value={form.confidence} onChange={e => setForm({...form, confidence: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" min="0" max="100" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data e Hora do Boom *</label>
            <input type="datetime-local" value={form.boom_time} onChange={e => setForm({...form, boom_time: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Resultado (após o boom)</label>
            <select value={form.result} onChange={e => setForm({...form, result: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Sem resultado ainda</option><option value="BUY">BUY</option><option value="SELL">SELL</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Imagem da análise</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Áudio da equipa</label>
            <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={addBoomTime}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90">
            Publicar Boom
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold">Boom Times ({filteredData.length})</h3>
            <ExportButton
              label="Exportar boom times"
              filename="boom-times"
              data={filteredData}
              columns={[
                { key: "pair", label: "Par" },
                { key: "boom_time", label: "Hora" },
                { key: "confidence", label: "Confiança (%)" },
                { key: "result", label: "Resultado" },
              ]}
            />
          </div>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Pesquisar boom times..." />
          <FilterChips
            filters={RESULT_FILTERS}
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
              {["Par","Hora","Confiança","Resultado","Ações"].map(h => (
                <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((raw) => {
              const b = raw as unknown as BoomTimeRow;
              return (
                <tr key={b.id} className={`border-b border-border/30 hover:bg-secondary/20 ${selectedIds.includes(b.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(b.id)}
                      onChange={() => toggleSelect(b.id)}
                      aria-label={`Selecionar ${b.pair}`}
                    />
                  </td>
                  <td className="p-3 font-bold text-primary">{b.pair}</td>
                  <td className="p-3 font-mono text-xs">{new Date(b.boom_time).toLocaleString("pt-PT")}</td>
                  <td className="p-3">{b.confidence}%</td>
                  <td className="p-3">
                    {b.result ? (
                      <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${b.result === "BUY" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                        {b.result}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 flex gap-2">
                    <select onChange={e => updateResult(b.id, e.target.value)} defaultValue={b.result || ""}
                      className="text-xs bg-secondary border border-border rounded px-1 py-1">
                      <option value="">Sem resultado</option><option value="BUY">BUY</option><option value="SELL">SELL</option>
                    </select>
                    <button onClick={async () => {
                      if (!confirm("Apagar boom?")) return;
                      try { await adminApi.deleteBoomTime(b.id); } catch (e: unknown) { alert("Erro: " + (e instanceof Error ? e.message : e)); }
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
          <p className="p-6 text-center text-sm text-muted-foreground">Sem boom times.</p>
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
