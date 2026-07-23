import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Trash2, Plus } from "lucide-react";
import * as adminApi from "@/lib/adminApi";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "EURGBP", "USDCHF", "NZDUSD", "USDCAD", "XAUUSD", "BTCUSD"];
const TIMEFRAMES = ["M15", "H1", "H4"];

interface Props {
  signals: any[];
  onRefresh: () => Promise<void>;
}

export function AdminSignalsTab({ signals, onRefresh }: Props) {
  const [form, setForm] = useState({
    symbol: "EURUSD", timeframe: "H1", signal_type: "BUY",
    entry_price: "", stop_loss: "", target_price: "", confidence: "75", reasons: "",
  });
  const [showAdd, setShowAdd] = useState(false);

  const deleteSignal = async (id: string) => {
    if (!confirm("Apagar este sinal?")) return;
    try { await adminApi.deleteSignal(id); } catch (e: any) { alert("Erro: " + e.message); }
    await onRefresh();
  };

  const updateStatus = async (id: string, status: string) => {
    try { await adminApi.updateSignalStatus(id, status); } catch (e: any) { alert("Erro: " + e.message); }
    await onRefresh();
  };

  const addSignal = async () => {
    if (!form.entry_price || !form.stop_loss || !form.target_price) {
      alert("Preenche todos os campos obrigatórios!"); return;
    }
    try {
      await adminApi.addSignal({
        symbol: form.symbol, timeframe: form.timeframe.toLowerCase(),
        signal_type: form.signal_type, entry_price: Number(form.entry_price),
        stop_loss: Number(form.stop_loss), target_price: Number(form.target_price),
        confidence: Number(form.confidence),
        reasons: form.reasons ? form.reasons.split("\n").filter(Boolean) : ["Sinal manual"],
      });
      alert("✅ Sinal adicionado!");
      setForm({ symbol: "EURUSD", timeframe: "H1", signal_type: "BUY", entry_price: "", stop_loss: "", target_price: "", confidence: "75", reasons: "" });
      setShowAdd(false);
      await onRefresh();
    } catch (e: any) { alert("Erro: " + e.message); }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => setShowAdd(!showAdd)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90">
        <Plus className="h-4 w-4" /> {showAdd ? "Fechar" : "+ Adicionar Sinal"}
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Par","TF","Tipo","Entrada","SL","TP","Conf.","Status","Ações"].map(h => (
                  <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map(s => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-secondary/20">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
