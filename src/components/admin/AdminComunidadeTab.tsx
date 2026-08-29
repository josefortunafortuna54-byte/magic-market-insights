import { useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import * as adminApi from "@/lib/adminApi";

interface Props {
  posts: any[];
  onRefresh: () => Promise<void>;
}

export function AdminComunidadeTab({ posts, onRefresh }: Props) {
  const [form, setForm] = useState({ title: "", content: "", pair: "", signal_type: "NEUTRO" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const addPost = async () => {
    if (!form.title) { alert("Título obrigatório!"); return; }
    let image_url = "";
    let audio_url = "";
    try {
      if (imageFile) {
        const cleanName = imageFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        image_url = await adminApi.uploadFile("posts", `posts/${Date.now()}-${cleanName}`, imageFile);
      }
      if (audioFile) {
        const cleanAudioName = audioFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        audio_url = await adminApi.uploadFile("posts", `posts-audio/${Date.now()}-${cleanAudioName}`, audioFile);
      }
      await adminApi.addPost({ ...form, image_url, audio_url });
      alert("✅ Post publicado!");
      setForm({ title: "", content: "", pair: "", signal_type: "NEUTRO" });
      setImageFile(null);
      setAudioFile(null);
      await onRefresh();
    } catch (e: any) { alert("Erro: " + e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 max-w-lg">
        <h2 className="font-display text-lg font-bold mb-6 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> Novo Post
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="Ex: EUR/USD — Oportunidade de compra" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Par</label>
              <input value={form.pair} onChange={e => setForm({...form, pair: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="EUR/USD" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sinal</label>
              <select value={form.signal_type} onChange={e => setForm({...form, signal_type: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                <option value="NEUTRO">Neutro</option><option value="BUY">BUY</option><option value="SELL">SELL</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Conteúdo</label>
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm h-24 resize-none"
              placeholder="Análise detalhada..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Imagem</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Áudio</label>
            <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={addPost}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90">
            Publicar Post
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {["Título","Par","Sinal","Ações"].map(h => (
                <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/20">
                <td className="p-3 font-semibold truncate max-w-xs">{p.title}</td>
                <td className="p-3 font-mono text-xs">{p.pair}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${p.signal_type === "BUY" ? "bg-success/20 text-success" : p.signal_type === "SELL" ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                    {p.signal_type}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={async () => {
                    if (!confirm("Apagar post?")) return;
                    try { await adminApi.deletePost(p.id); } catch (e: any) { alert("Erro: " + e.message); }
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
