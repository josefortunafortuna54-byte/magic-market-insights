import { useState } from "react";
import { Zap, Trash2 } from "lucide-react";
import * as adminApi from "@/lib/adminApi";

interface Props {
  boomHours: any[];
  onRefresh: () => Promise<void>;
}

export function AdminBoomHoursTab({ boomHours, onRefresh }: Props) {
  const [form, setForm] = useState({
    title: "", time_gmt: "", time_wat: "", pairs: "", days: "", description: "", volatility: "4", badge: "",
  });

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
    } catch (e: any) { alert("Erro: " + e.message); }
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {["Título","GMT","WAT","Dias","Pares","Ações"].map(h => (
                <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boomHours.map(b => (
              <tr key={b.id} className="border-b border-border/30 hover:bg-secondary/20">
                <td className="p-3 font-semibold">{b.title}</td>
                <td className="p-3 font-mono text-xs">{b.time_gmt}</td>
                <td className="p-3 font-mono text-xs">{b.time_wat}</td>
                <td className="p-3 text-xs text-muted-foreground">{b.days || "Todos"}</td>
                <td className="p-3 text-xs text-muted-foreground">{b.pairs?.join(", ")}</td>
                <td className="p-3">
                  <button onClick={async () => {
                    if (!confirm("Apagar?")) return;
                    try { await adminApi.deleteBoomHour(b.id); } catch (e: any) { alert("Erro: " + e.message); }
                    await onRefresh();
                  }} className="text-destructive hover:opacity-70">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
