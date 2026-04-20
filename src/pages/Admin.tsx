import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Shield, Plus, RefreshCw, TrendingUp, TrendingDown, Users, BarChart3, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { Shield, Plus, RefreshCw, TrendingUp, TrendingDown, Users, BarChart3, CheckCircle, XCircle, Trash2, Zap } from "lucide-react";

const ADMIN_EMAILS = ["josefortunafortuna54@gmail.com", "jeronimo.samaina239898@gmail.com"];

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "EURGBP", "USDCHF", "NZDUSD", "USDCAD"];
const TIMEFRAMES = ["M15", "H1", "H4"];

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, tp: 0, sl: 0, users: 0, premium: 0 });
  const [generating, setGenerating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState<"signals" | "users" | "add">("signals");
  const [postForm, setPostForm] = useState({ title: "", content: "", pair: "", signal_type: "NEUTRO" });
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postAudio, setPostAudio] = useState<File | null>(null);
  const [posts, setPosts] = useState<any[]>([]);

  const [boomTimes, setBoomTimes] = useState<any[]>([]);
  const [boomTimeForm, setBoomTimeForm] = useState({
  pair: "", boom_time: "", confidence: "75", result: ""
});
  const [boomImage, setBoomImage] = useState<File | null>(null);
  const [boomAudio, setBoomAudio] = useState<File | null>(null);

  const [boomHours, setBoomHours] = useState<any[]>([]);
  const [boomForm, setBoomForm] = useState({
  title: "", time_gmt: "", time_wat: "", pairs: "", description: "", volatility: "4", badge: "",
  
});
  // Formulário novo sinal
  const [form, setForm] = useState({
    symbol: "EURUSD", timeframe: "H1", signal_type: "BUY",
    entry_price: "", stop_loss: "", target_price: "", confidence: "75", reasons: "",
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      navigate("/");
      return;
    }
    setUser(user);
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    // Sinais
    const { data: signalsData } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setSignals(signalsData || []);

    // Subscrições
    const { data: subsData } = await supabase
      .from("subscriptions")
      .select("*");

    // Utilizadores — contar via auth
    const { count: usersCount } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true });

    // Boom Hours
    const { data: boomData } = await supabase
      .from("boom_hours")
      .select("*")
      .order("created_at", { ascending: true });
    setBoomHours(boomData || []);

    // Posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setPosts(postsData || []);

    // Boom Times
    const { data: boomTimesData } = await supabase
      .from("boom_times")
      .select("*")
      .order("boom_time", { ascending: false })
      .limit(20);
    setBoomTimes(boomTimesData || []);

    const s = signalsData || [];
    setStats({
      total: s.length,
      active: s.filter((x: any) => x.status === "active").length,
      tp: s.filter((x: any) => x.status === "tp").length,
      sl: s.filter((x: any) => x.status === "sl").length,
      users: usersCount || 0,
      premium: subsData?.filter((x: any) => x.status === "active").length || 0,
    });
  };

  const generateSignals = async () => {
    setGenerating(true);
    try {
      const body = SYMBOLS.map(s => ({ symbol: s, timeframe: "1h" }));
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-signal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      alert(`✅ ${data.results?.length || 0} sinais gerados!`);
      await loadData();
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setGenerating(false);
  };

  const closeSignals = async () => {
    setClosing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/close-signals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      alert(`✅ ${data.closed || 0} sinais fechados!`);
      await loadData();
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setClosing(false);
  };

  const deleteSignal = async (id: string) => {
    if (!confirm("Apagar este sinal?")) return;
    await supabase.from("signals").delete().eq("id", id);
    await loadData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("signals").update({ status }).eq("id", id);
    await loadData();
  };

  const addSignal = async () => {
    if (!form.entry_price || !form.stop_loss || !form.target_price) {
      alert("Preenche todos os campos obrigatórios!");
      return;
    }
    const { error } = await supabase.from("signals").insert([{
      symbol: form.symbol,
      timeframe: form.timeframe.toLowerCase(),
      signal_type: form.signal_type,
      entry_price: Number(form.entry_price),
      stop_loss: Number(form.stop_loss),
      target_price: Number(form.target_price),
      confidence: Number(form.confidence),
      reasons: form.reasons ? form.reasons.split("\n").filter(Boolean) : ["Sinal manual"],
      status: "active",
    }]);
    if (error) { alert("Erro: " + error.message); return; }
    alert("✅ Sinal adicionado!");
    setForm({ symbol: "EURUSD", timeframe: "H1", signal_type: "BUY", entry_price: "", stop_loss: "", target_price: "", confidence: "75", reasons: "" });
    await loadData();
    setTab("signals");
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Painel Admin</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            {[
              { label: "Total", value: stats.total, color: "text-primary" },
              { label: "Ativos", value: stats.active, color: "text-warning" },
              { label: "TP", value: stats.tp, color: "text-success" },
              { label: "SL", value: stats.sl, color: "text-destructive" },
              { label: "Utilizadores", value: stats.users, color: "text-primary" },
              { label: "Premium", value: stats.premium, color: "text-accent" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Botões de ação */}
          <button onClick={async () => {
            if (!confirm("Apagar todos os sinais ativos e regenerar?")) return;
            await supabase.from("signals").delete().eq("status", "active");
            await generateSignals();
          }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/20 text-destructive border border-destructive/30 text-sm font-medium hover:opacity-90">
            <RefreshCw className="h-4 w-4" />
            Limpar e Regenerar
          </button>
          <div className="flex gap-3 mb-8 flex-wrap">
            <button onClick={generateSignals} disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "A gerar..." : "Gerar Sinais"}
            </button>
            <button onClick={closeSignals} disabled={closing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warning/20 text-warning border border-warning/30 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <CheckCircle className="h-4 w-4" />
              {closing ? "A verificar..." : "Fechar Sinais (TP/SL)"}
            </button>
            <button onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-medium hover:opacity-90">
              <BarChart3 className="h-4 w-4" />
              Atualizar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { key: "signals", label: "Sinais" },
              { key: "add", label: "+ Adicionar Sinal" },
              { key: "users", label: "Utilizadores" },
              { key: "boom", label: "⚡ Hora do Boom" },
              { key: "comunidade", label: "💬 Comunidade" },
              { key: "boom_times", label: "⚡ Boom Times" }, 
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Adicionar Sinal */}
          {tab === "add" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 max-w-lg">
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
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
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
                    placeholder="RSI em sobrevenda&#10;MACD bullish&#10;Suporte chave" />
                </div>
                <button onClick={addSignal}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90">
                  ✅ Adicionar Sinal
                </button>
              </div>
            </motion.div>
          )}

          {/* Tab: Sinais */}
          {tab === "signals" && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 text-xs text-muted-foreground">Par</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">TF</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">Tipo</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">Entrada</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">SL</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">TP</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">Conf.</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">Status</th>
                      <th className="text-left p-3 text-xs text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((s, i) => (
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
                            <option value="active">Ativo</option>
                            <option value="pending">Pendente</option>
                            <option value="tp">✓ TP</option>
                            <option value="sl">✗ SL</option>
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
          )}

          {tab === "boom" && (
  <div className="space-y-6">
    <div className="glass-card p-6 max-w-lg">
      <h2 className="font-display text-lg font-bold mb-6 flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" /> Adicionar Hora do Boom
      </h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
          <input value={boomForm.title} onChange={e => setBoomForm({...boomForm, title: e.target.value})}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
            placeholder="Ex: Londres + Nova Iorque" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hora GMT *</label>
            <input value={boomForm.time_gmt} onChange={e => setBoomForm({...boomForm, time_gmt: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="13:00 – 17:00" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hora WAT *</label>
            <input value={boomForm.time_wat} onChange={e => setBoomForm({...boomForm, time_wat: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="14:00 – 18:00" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pares (separados por vírgula)</label>
          <input value={boomForm.pairs} onChange={e => setBoomForm({...boomForm, pairs: e.target.value})}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
            placeholder="EUR/USD, GBP/USD, USD/JPY" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Volatilidade (1-5)</label>
            <input type="number" min="1" max="5" value={boomForm.volatility}
              onChange={e => setBoomForm({...boomForm, volatility: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Badge (opcional)</label>
            <input value={boomForm.badge} onChange={e => setBoomForm({...boomForm, badge: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="🔥 Melhor Período" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
          <textarea value={boomForm.description} onChange={e => setBoomForm({...boomForm, description: e.target.value})}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none"
            placeholder="Descreve este período de Hora do Boom..." />
        </div>
        <button onClick={async () => {
          if (!boomForm.title || !boomForm.time_gmt || !boomForm.time_wat) { alert("Preenche os campos obrigatórios!"); return; }
          const pairs = boomForm.pairs.split(",").map(p => p.trim()).filter(Boolean);
          const { error } = await supabase.from("boom_hours").insert([{
            title: boomForm.title, time_gmt: boomForm.time_gmt, time_wat: boomForm.time_wat,
            pairs, description: boomForm.description, volatility: Number(boomForm.volatility),
            badge: boomForm.badge, is_active: true,
          }]);
          if (error) { alert("Erro: " + error.message); return; }
          alert("✅ Hora do Boom adicionada!");
          setBoomForm({ title: "", time_gmt: "", time_wat: "", pairs: "", description: "", volatility: "4", badge: "" });
          await loadData();
        }}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90">
          ✅ Publicar Hora do Boom
        </button>
      </div>
    </div>

    {/* Lista */}
    <div className="glass-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left p-3 text-xs text-muted-foreground">Título</th>
            <th className="text-left p-3 text-xs text-muted-foreground">GMT</th>
            <th className="text-left p-3 text-xs text-muted-foreground">WAT</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Pares</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {boomHours.map(b => (
            <tr key={b.id} className="border-b border-border/30 hover:bg-secondary/20">
              <td className="p-3 font-semibold">{b.title}</td>
              <td className="p-3 font-mono text-xs">{b.time_gmt}</td>
              <td className="p-3 font-mono text-xs">{b.time_wat}</td>
              <td className="p-3 text-xs text-muted-foreground">{b.pairs?.join(", ")}</td>
              <td className="p-3">
                <button onClick={async () => {
                  if (!confirm("Apagar?")) return;
                  await supabase.from("boom_hours").delete().eq("id", b.id);
                  await loadData();
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
)}

          {tab === "comunidade" && (
  <div className="space-y-6">
    <div className="glass-card p-6 max-w-lg">
      <h2 className="font-display text-lg font-bold mb-6">📝 Novo Post</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
          <input value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
            placeholder="Ex: EUR/USD — Oportunidade de compra" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Par</label>
            <input value={postForm.pair} onChange={e => setPostForm({...postForm, pair: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="EUR/USD" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sinal</label>
            <select value={postForm.signal_type} onChange={e => setPostForm({...postForm, signal_type: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
              <option value="NEUTRO">Neutro</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Conteúdo</label>
          <textarea value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm h-24 resize-none"
            placeholder="Análise detalhada..." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Imagem</label>
          <input type="file" accept="image/*" onChange={e => setPostImage(e.target.files?.[0] || null)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Áudio</label>
          <input type="file" accept="audio/*" onChange={e => setPostAudio(e.target.files?.[0] || null)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={async () => {
          if (!postForm.title) { alert("Título obrigatório!"); return; }
          let image_url = "";
          let audio_url = "";
          if (postImage) {
            const cleanName = postImage.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
            const filename = `posts/${Date.now()}-${cleanName}`;
            await supabase.storage.from("posts").upload(filename, postImage);
            const { data } = supabase.storage.from("posts").getPublicUrl(filename);
            image_url = data.publicUrl;
          }
          if (postAudio) {
            const cleanAudioName = postAudio.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
            await supabase.storage.from("posts").upload(filename, postAudio);
            const { data } = supabase.storage.from("posts").getPublicUrl(filename);
            audio_url = data.publicUrl;
          }
          const { error } = await supabase.from("posts").insert([{
            ...postForm, image_url, audio_url, is_active: true
          }]);
          if (error) { alert("Erro: " + error.message); return; }
          alert("✅ Post publicado!");
          setPostForm({ title: "", content: "", pair: "", signal_type: "NEUTRO" });
          setPostImage(null);
          setPostAudio(null);
          await loadData();
        }}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90">
          ✅ Publicar Post
        </button>
      </div>
    </div>

    <div className="glass-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left p-3 text-xs text-muted-foreground">Título</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Par</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Sinal</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Ações</th>
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
                  await supabase.from("posts").delete().eq("id", p.id);
                  await loadData();
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
)}
         {tab === "boom_times" && (
  <div className="space-y-6">
    <div className="glass-card p-6 max-w-lg">
      <h2 className="font-display text-lg font-bold mb-6">⚡ Novo Boom</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Par *</label>
            <input value={boomTimeForm.pair} onChange={e => setBoomTimeForm({...boomTimeForm, pair: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" placeholder="XAUUSD" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Confiança (%)</label>
            <input type="number" value={boomTimeForm.confidence} onChange={e => setBoomTimeForm({...boomTimeForm, confidence: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" min="0" max="100" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Data e Hora do Boom *</label>
          <input type="datetime-local" value={boomTimeForm.boom_time} onChange={e => setBoomTimeForm({...boomTimeForm, boom_time: e.target.value})}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Resultado (após o boom)</label>
          <select value={boomTimeForm.result} onChange={e => setBoomTimeForm({...boomTimeForm, result: e.target.value})}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">Sem resultado ainda</option>
            <option value="BUY">✅ BUY</option>
            <option value="SELL">❌ SELL</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Imagem da análise</label>
          <input type="file" accept="image/*" onChange={e => setBoomImage(e.target.files?.[0] || null)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Áudio da equipa</label>
          <input type="file" accept="audio/*" onChange={e => setBoomAudio(e.target.files?.[0] || null)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={async () => {
          if (!boomTimeForm.pair || !boomTimeForm.boom_time) { alert("Par e hora obrigatórios!"); return; }
          let image_url = "";
          let audio_url = "";
          if (boomImage) {
            const clean = boomImage.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
            const filename = `boom/${Date.now()}-${clean}`;
            await supabase.storage.from("posts").upload(filename, boomImage);
            const { data } = supabase.storage.from("posts").getPublicUrl(filename);
            image_url = data.publicUrl;
          }
          if (boomAudio) {
            const clean = boomAudio.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
            const filename = `boom-audio/${Date.now()}-${clean}`;
            await supabase.storage.from("posts").upload(filename, boomAudio);
            const { data } = supabase.storage.from("posts").getPublicUrl(filename);
            audio_url = data.publicUrl;
          }
          const { error } = await supabase.from("boom_times").insert([{
            pair: boomTimeForm.pair,
            boom_time: new Date(boomTimeForm.boom_time).toISOString(),
            confidence: Number(boomTimeForm.confidence),
            result: boomTimeForm.result || null,
            image_url, audio_url, is_active: true,
          }]);
          if (error) { alert("Erro: " + error.message); return; }
          alert("✅ Boom publicado!");
          setBoomTimeForm({ pair: "", boom_time: "", confidence: "75", result: "" });
          setBoomImage(null); setBoomAudio(null);
          await loadData();
        }}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90">
          ⚡ Publicar Boom
        </button>
      </div>
    </div>
    <div className="glass-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left p-3 text-xs text-muted-foreground">Par</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Hora</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Confiança</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Resultado</th>
            <th className="text-left p-3 text-xs text-muted-foreground">Ações</th>
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
                <select onChange={async e => {
                  await supabase.from("boom_times").update({ result: e.target.value || null }).eq("id", b.id);
                  await loadData();
                }} defaultValue={b.result || ""}
                  className="text-xs bg-secondary border border-border rounded px-1 py-1">
                  <option value="">Sem resultado</option>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
                <button onClick={async () => {
                  if (!confirm("Apagar boom?")) return;
                  await supabase.from("boom_times").delete().eq("id", b.id);
                  await loadData();
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
)}
          
               
          {/* Tab: Utilizadores */}
          {tab === "users" && (
            <div className="glass-card p-6 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>Gestão de utilizadores em breve</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
