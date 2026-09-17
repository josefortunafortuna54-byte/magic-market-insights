import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import * as adminApi from "@/lib/adminApi";
import { useAdminSearch } from "@/hooks/useAdminSearch";
import { SearchBar } from "@/components/admin/SearchBar";
import { FilterChips } from "@/components/admin/FilterChips";
import { ExportButton } from "@/components/admin/ExportButton";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "EURGBP", "USDCHF", "NZDUSD", "USDCAD", "XAUUSD", "BTCUSD"];
const TIMEFRAMES = ["M15", "H1", "H4"];

interface SignalRow {
  id: string;
  symbol: string;
  timeframe: string;
  signal_type: string;
  entry_price: number | string;
  stop_loss: number | string;
  target_price: number | string;
  confidence: number | string;
  status: string;
}

interface Props {
  signals: Record<string, unknown>[];
  onRefresh: () => Promise<void>;
}

const SIGNAL_FILTERS = [
  { key: "buy", label: "BUY", value: "BUY" },
  { key: "sell", label: "SELL", value: "SELL" },
];

export function AdminSignalsTab({ signals, onRefresh }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    symbol: "EURUSD", timeframe: "H1", signal_type: "BUY",
    entry_price: "", stop_loss: "", target_price: "", confidence: "75", reasons: "",
  });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: signals,
    searchFields: ["symbol", "signal_type"],
    filterConfig: SIGNAL_FILTERS,
    filterField: "signal_type",
  });

  const deleteSignal = async (id: string) => {
    if (!confirm(t("admin.deleteSignalTitle"))) return;
    try { await adminApi.deleteSignal(id); } catch (e: unknown) { alert(`${t("adminErrors.unknown")}: ${e instanceof Error ? e.message : e}`); }
    await onRefresh();
  };

  const updateStatus = async (id: string, status: string) => {
    try { await adminApi.updateSignalStatus(id, status); } catch (e: unknown) { alert(`${t("adminErrors.unknown")}: ${e instanceof Error ? e.message : e}`); }
    await onRefresh();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const filteredIds = filteredData.map((s) => (s as unknown as SignalRow).id);
    if (selectedIds.length === filteredIds.length && filteredIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(t("admin.confirmDelete", { count: selectedIds.length }))) return;
    try {
      await adminApi.bulkDeleteSignals(selectedIds);
      toast.success(t("admin.signalsDeleted"));
      setSelectedIds([]);
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("adminErrors.signalDelete"));
    }
  };

  const addSignal = async () => {
    if (!form.entry_price || !form.stop_loss || !form.target_price) {
      alert(t("admin.requiredFields")); return;
    }
    try {
      await adminApi.addSignal({
        symbol: form.symbol, timeframe: form.timeframe.toLowerCase(),
        signal_type: form.signal_type, entry_price: Number(form.entry_price),
        stop_loss: Number(form.stop_loss), target_price: Number(form.target_price),
        confidence: Number(form.confidence),
        reasons: form.reasons ? form.reasons.split("\n").filter(Boolean) : [t("admin.manualSignal")],
      });
      alert(t("admin.signalAdded"));
      setForm({ symbol: "EURUSD", timeframe: "H1", signal_type: "BUY", entry_price: "", stop_loss: "", target_price: "", confidence: "75", reasons: "" });
      setShowAdd(false);
      await onRefresh();
    } catch (e: unknown) { alert(`${t("adminErrors.unknown")}: ${e instanceof Error ? e.message : e}`); }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => setShowAdd(!showAdd)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90">
        <Plus className="h-4 w-4" /> {showAdd ? t("common.close") : `+ ${t("admin.addSignal")}`}
      </button>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 max-w-lg">
          <h2 className="font-display text-lg font-bold mb-6 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Novo Sinal Manual
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Par</label>
                <select value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                  {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Timeframe</label>
                <select value={form.timeframe} onChange={e => setForm({...form, timeframe: e.target.value})}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                  {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <select value={form.signal_type} onChange={e => setForm({...form, signal_type: e.target.value})}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="BUY">BUY</option><option value="SELL">SELL</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confiança (%)</label>
                <input type="number" value={form.confidence} onChange={e => setForm({...form, confidence: e.target.value})}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" min="0" max="100" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço de Entrada *</label>
              <input type="number" step="0.00001" value={form.entry_price} onChange={e => setForm({...form, entry_price: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="1.08500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Stop Loss *</label>
                <input type="number" step="0.00001" value={form.stop_loss} onChange={e => setForm({...form, stop_loss: e.target.value})}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="1.08000" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Take Profit *</label>
                <input type="number" step="0.00001" value={form.target_price} onChange={e => setForm({...form, target_price: e.target.value})}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="1.09500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Razões (uma por linha)</label>
              <textarea value={form.reasons} onChange={e => setForm({...form, reasons: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm h-24 resize-none"
                placeholder={"RSI em sobrevenda\nMACD bullish\nSuporte chave"} />
            </div>
            <button onClick={addSignal}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90">
              Adicionar Sinal
            </button>
          </div>
        </motion.div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold">Sinais ({filteredData.length})</h3>
            <ExportButton
              label="Exportar sinais"
              filename="sinais"
              data={filteredData}
              columns={[
                { key: "symbol", label: "Par" },
                { key: "timeframe", label: "Timeframe" },
                { key: "signal_type", label: "Tipo" },
                { key: "entry_price", label: "Entrada" },
                { key: "stop_loss", label: "Stop Loss" },
                { key: "target_price", label: "Take Profit" },
                { key: "confidence", label: "Confiança (%)" },
                { key: "status", label: "Status" },
              ]}
            />
          </div>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Pesquisar sinais..." />
          <FilterChips
            filters={SIGNAL_FILTERS}
            activeFilters={activeFilters}
            onToggle={toggleFilter}
            onClear={clearFilters}
          />
        </div>
        <div className="overflow-x-auto">
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
                {["Par","TF","Tipo","Entrada","SL","TP","Conf.","Status","Ações"].map(h => (
                  <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((raw) => {
                const s = raw as unknown as SignalRow;
                return (
                  <tr key={s.id} className={`border-b border-border/30 hover:bg-secondary/20 ${selectedIds.includes(s.id) ? "bg-primary/5" : ""}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        aria-label={`Selecionar ${s.symbol}`}
                      />
                    </td>
                    <td className="p-3 font-semibold">{s.symbol}</td>
                    <td className="p-3 text-muted-foreground">{s.timeframe}</td>
                    <td className="p-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 w-fit ${s.signal_type === "BUY" ? "bg-success/10 text-success" : s.signal_type === "SELL" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                        {s.signal_type === "BUY" ? <TrendingUp className="h-3 w-3" /> : s.signal_type === "SELL" ? <TrendingDown className="h-3 w-3" /> : null}
                        {s.signal_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{Number(s.entry_price).toFixed(5)}</td>
                    <td className="p-3 font-mono text-destructive">{Number(s.stop_loss).toFixed(5)}</td>
                    <td className="p-3 font-mono text-success">{Number(s.target_price).toFixed(5)}</td>
                    <td className="p-3">{s.confidence}%</td>
                    <td className="p-3">
                      <select value={s.status} onChange={e => updateStatus(s.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-lg border-0 font-semibold ${s.status === "active" ? "bg-warning/20 text-warning" : s.status === "tp" ? "bg-success/20 text-success" : s.status === "sl" ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                        <option value="active">Ativo</option><option value="pending">Pendente</option>
                        <option value="tp">✓ TP</option><option value="sl">✗ SL</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <button onClick={() => deleteSignal(s.id)} className="text-destructive hover:opacity-70">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Sem sinais.</p>
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
