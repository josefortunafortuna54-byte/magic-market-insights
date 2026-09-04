import { useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as adminApi from "@/lib/adminApi";
import { useAdminSearch } from "@/hooks/useAdminSearch";
import { SearchBar } from "@/components/admin/SearchBar";
import { FilterChips } from "@/components/admin/FilterChips";
import { ExportButton } from "@/components/admin/ExportButton";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";

interface PostRow {
  id: string;
  title: string;
  pair?: string;
  signal_type?: string;
  is_active?: boolean;
  created_at?: string;
}

interface Props {
  posts: Record<string, unknown>[];
  onRefresh: () => Promise<void>;
}

const ACTIVE_FILTERS = [
  { key: "active", label: "Active", value: "true" },
  { key: "inactive", label: "Inactive", value: "false" },
];

export function AdminComunidadeTab({ posts, onRefresh }: Props) {
  const [form, setForm] = useState({ title: "", content: "", pair: "", signal_type: "NEUTRO" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters, filteredData,
  } = useAdminSearch({
    data: posts,
    searchFields: ["title"],
    filterConfig: ACTIVE_FILTERS,
    filterField: "is_active",
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const filteredIds = filteredData.map((p) => (p as unknown as PostRow).id);
    if (selectedIds.length === filteredIds.length && filteredIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Apagar ${selectedIds.length} posts selecionados?`)) return;
    try {
      await adminApi.bulkDeletePosts(selectedIds);
      toast.success("Posts apagados");
      setSelectedIds([]);
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao apagar posts");
    }
  };

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
    } catch (e: unknown) { alert("Erro: " + (e instanceof Error ? e.message : e)); }
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
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold">Posts ({filteredData.length})</h3>
            <ExportButton
              label="Exportar posts"
              filename="posts"
              data={filteredData}
              columns={[
                { key: "title", label: "Título" },
                { key: "pair", label: "Par" },
                { key: "signal_type", label: "Sinal" },
                { key: "is_active", label: "Ativo" },
                { key: "created_at", label: "Data" },
              ]}
            />
          </div>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Pesquisar posts..." />
          <FilterChips
            filters={ACTIVE_FILTERS}
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
              {["Título","Par","Sinal","Ações"].map(h => (
                <th key={h} className="text-left p-3 text-xs text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((raw) => {
              const p = raw as unknown as PostRow;
              return (
                <tr key={p.id} className={`border-b border-border/30 hover:bg-secondary/20 ${selectedIds.includes(p.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      aria-label={`Selecionar ${p.title}`}
                    />
                  </td>
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
                      try { await adminApi.deletePost(p.id); } catch (e: unknown) { alert("Erro: " + (e instanceof Error ? e.message : e)); }
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
          <p className="p-6 text-center text-sm text-muted-foreground">Sem posts.</p>
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
