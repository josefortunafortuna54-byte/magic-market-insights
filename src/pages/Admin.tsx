import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Shield, Plus, RefreshCw, TrendingUp, TrendingDown, Users, BarChart3, CheckCircle, XCircle, Trash2 } from "lucide-react";

const ADMIN_EMAIL = "josefortunafortuna54@gmail.com";

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
    if (!user || user.email !== ADMIN_EMAIL) {
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

    const s = signalsData || [];
    setStats({
      total: s.length,
      active: s.filter((x: any) => x.status === "active").length,
      tp: s.filter((x: any) => x.status === "tp").length,
      sl: s.filter((x: any) => x.status === "sl").length,
      users: subsData?.length || 0,
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
