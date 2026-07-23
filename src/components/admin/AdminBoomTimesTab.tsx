import { useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import * as adminApi from "@/lib/adminApi";

interface Props {
  boomTimes: any[];
  onRefresh: () => Promise<void>;
}

export function AdminBoomTimesTab({ boomTimes, onRefresh }: Props) {
  const [form, setForm] = useState({ pair: "", boom_time: "", confidence: "75", result: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

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
    } catch (e: any) { alert("Erro: " + e.message); }
  };

  const updateResult = async (id: string, result: string) => {
    try { await adminApi.updateBoomResult(id, result); } catch (e: any) { alert("Erro: " + e.message); }
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {["Par","Hora","Confiança","Resultado","Ações"].map(h => (
                <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boomTimes.map(b => (
              <tr key={b.id} className="border-b border-border/30 hover:bg-secondary/20">
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
                    try { await adminApi.deleteBoomTime(b.id); } catch (e: any) { alert("Erro: " + e.message); }
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
