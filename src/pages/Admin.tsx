import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/admin";
import * as adminApi from "@/lib/adminApi";
import { Layout } from "@/components/layout/Layout";
import { Shield, RefreshCw, BarChart3, CheckCircle } from "lucide-react";

import { AdminSignalsTab } from "@/components/admin/AdminSignalsTab";
import { AdminBoomHoursTab } from "@/components/admin/AdminBoomHoursTab";
import { AdminComunidadeTab } from "@/components/admin/AdminComunidadeTab";
import { AdminBoomTimesTab } from "@/components/admin/AdminBoomTimesTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "EURGBP", "USDCHF", "NZDUSD", "USDCAD", "XAUUSD", "BTCUSD"];

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [subsData, setSubsData] = useState<any[]>([]);
  const [boomTimes, setBoomTimes] = useState<any[]>([]);
  const [boomHours, setBoomHours] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, tp: 0, sl: 0, users: 0, premium: 0 });
  const [generating, setGenerating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState<"signals" | "users" | "boom" | "comunidade" | "boom_times">("signals");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isAdminEmail(user.email)) { navigate("/"); return; }
      await loadData();
      setLoading(false);
    })();
  }, []);

  const loadData = async () => {
    const { data: signalsData } = await supabase.from("signals").select("*").order("created_at", { ascending: false }).limit(100);
    setSignals(signalsData || []);
    const { data: usersData } = await supabase.rpc("get_all_users");
    setUsersList(usersData || []);
    const { data: subsResult } = await supabase.from("subscriptions").select("*");
    setSubsData(subsResult || []);
    const { data: usersCountData } = await supabase.rpc("get_users_count");
    const usersCount = usersCountData || 0;
    const { data: boomData } = await supabase.from("boom_hours").select("*").order("created_at", { ascending: true });
    setBoomHours(boomData || []);
    const { data: postsData } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(20);
    setPosts(postsData || []);
    const { data: boomTimesData } = await supabase.from("boom_times").select("*").order("boom_time", { ascending: false }).limit(20);
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
    } catch (err: any) { alert("Erro: " + err.message); }
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
    } catch (err: any) { alert("Erro: " + err.message); }
    setClosing(false);
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
            <button onClick={async () => {
              if (!confirm("Apagar todos os sinais ativos e regenerar?")) return;
              try { await adminApi.deleteAllActiveSignals(); } catch (e: any) { alert("Erro: " + e.message); }
              await generateSignals();
            }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/20 text-destructive border border-destructive/30 text-sm font-medium hover:opacity-90">
              <RefreshCw className="h-4 w-4" /> Limpar e Regenerar
            </button>
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
              <BarChart3 className="h-4 w-4" /> Atualizar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { key: "signals", label: "Sinais" },
              { key: "users", label: "Utilizadores" },
              { key: "boom", label: "⚡ Hora do Boom" },
              { key: "comunidade", label: "💬 Comunidade" },
              { key: "boom_times", label: "⚡ Boom Times" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === "signals" && <AdminSignalsTab signals={signals} onRefresh={loadData} />}
          {tab === "boom" && <AdminBoomHoursTab boomHours={boomHours} onRefresh={loadData} />}
          {tab === "comunidade" && <AdminComunidadeTab posts={posts} onRefresh={loadData} />}
          {tab === "boom_times" && <AdminBoomTimesTab boomTimes={boomTimes} onRefresh={loadData} />}
          {tab === "users" && <AdminUsersTab usersList={usersList} subsData={subsData} />}
        </div>
      </section>
    </Layout>
  );
}
