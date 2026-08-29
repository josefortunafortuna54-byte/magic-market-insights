import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, Info, Bell, BellOff, Clock } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/lib/supabaseClient";

interface BoomHour {
  id: string;
  title: string;
  time_gmt: string;
  time_wat: string;
  pairs: string[];
  description: string;
  volatility: number;
  is_active: boolean;
  badge: string;
  days: string;
}

function VolatilityDots({ level }: { level: number }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`w-2 h-2 rounded-full ${i <= level ? "bg-primary" : "bg-secondary"}`} />
      ))}
    </div>
  );
}

function getWATTime() {
  const now = new Date();
  const h = (now.getUTCHours() + 1) % 24;
  const m = now.getUTCMinutes();
  return { h, m, total: h + m / 60 };
}

function parseWAT(timeStr: string): { start: number; end: number } {
  const parts = timeStr.split(" – ");
  const parseH = (t: string) => {
    const [h, m] = t.trim().split(":").map(Number);
    return h + (m || 0) / 60;
  };
  return { start: parseH(parts[0]), end: parseH(parts[1] || parts[0]) };
}

function getStatus(time_wat: string): "active" | "expired" | "upcoming" {
  const { total } = getWATTime();
  const { start, end } = parseWAT(time_wat);
  if (total >= start && total < end) return "active";
  if (total >= end) return "expired";
  return "upcoming";
}

export default function Horarios() {
  const [boomHours, setBoomHours] = useState<BoomHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [alarms, setAlarms] = useState<Record<string, boolean>>({});
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [currentTime, setCurrentTime] = useState(getWATTime());

  useEffect(() => {
    const saved = localStorage.getItem("boom_alarms");
    if (saved) setAlarms(JSON.parse(saved));
    if ("Notification" in window) setNotifPermission(Notification.permission);
    const interval = setInterval(() => setCurrentTime(getWATTime()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("boom_hours")
        .select("*")
        .eq("is_active", true)
        .order("time_wat", { ascending: true });
      setBoomHours(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (boomHours.length === 0) return;
    const interval = setInterval(() => {
      boomHours.forEach(item => {
        if (!alarms[item.id]) return;
        const { start } = parseWAT(item.time_wat);
        const { total } = getWATTime();
        const diff = start - total;
        if (diff > 0 && diff <= 5 / 60) {
          if (Notification.permission === "granted") {
            new Notification("⚡ Hora do Boom!", {
              body: `${item.pairs.join(", ")} — ${item.time_wat} WAT`,
              icon: "/logo.png",
            });
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [boomHours, alarms]);

  const toggleAlarm = useCallback(async (id: string) => {
    if (notifPermission !== "granted") {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm !== "granted") {
        alert("Precisas de permitir notificações para ativar o alarme!");
        return;
      }
    }
    const newAlarms = { ...alarms, [id]: !alarms[id] };
    setAlarms(newAlarms);
    localStorage.setItem("boom_alarms", JSON.stringify(newAlarms));
  }, [alarms, notifPermission]);

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 max-w-lg">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <Bell className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">⚡ Hora do Boom</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Horários de grandes movimentos selecionados pela equipa{" "}
              <span className="text-primary font-semibold">The Magic Trader</span>
            </p>
          </motion.div>

          {/* Hora atual */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Hora atual (Angola)</p>
              <p className="font-display text-2xl font-bold text-primary">
                {String(currentTime.h).padStart(2, "0")}:{String(currentTime.m).padStart(2, "0")} WAT
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">GMT</p>
              <p className="font-mono text-sm text-muted-foreground">
                {String((currentTime.h - 1 + 24) % 24).padStart(2, "0")}:{String(currentTime.m).padStart(2, "0")}
              </p>
            </div>
          </motion.div>

          {/* Notificações desativadas aviso */}
          {notifPermission === "denied" && (
            <div className="glass-card p-3 mb-4 border border-warning/30 bg-warning/5 flex items-center gap-2">
              <BellOff className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-warning">Notificações bloqueadas. Ativa nas definições do browser para receber alertas.</p>
            </div>
          )}

          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">A carregar horários...</p>
            </div>
          ) : boomHours.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-display text-lg font-semibold mb-2">Sem horários publicados</h3>
              <p className="text-sm text-muted-foreground">A equipa ainda não publicou horários.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {boomHours.map((item, i) => {
                const status = getStatus(item.time_wat);
                const isOn = !!alarms[item.id];
                const [startWAT] = item.time_wat.split(" – ");

                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`border-b border-border/40 py-5 flex items-center justify-between ${
                      status === "active" ? "bg-primary/5 px-3 rounded-xl border-primary/20" : ""
                    }`}>

                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className={`font-display text-5xl font-light tracking-tight ${
                          status === "expired" ? "text-muted-foreground/40" : "text-foreground"
                        }`}>
                          {startWAT}
                        </span>
                        {status === "active" && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold animate-pulse">
                            ● Agora
                          </span>
                        )}
                        {status === "expired" && (
                          <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Expirado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {item.pairs.map(pair => (
                          <span key={pair} className={`font-mono text-sm font-semibold ${
                            status === "expired" ? "text-muted-foreground/40" : "text-primary"
                          }`}>
                            {pair}
                          </span>
                        ))}
                        {item.badge && <span className="text-sm">{item.badge}</span>}
                      </div>

                      <p className={`text-xs ${status === "expired" ? "text-muted-foreground/30" : "text-muted-foreground"}`}>
                        {item.days || "Todos os dias"} · GMT {item.time_gmt}
                      </p>

                      {item.description && (
                        <p className={`text-xs mt-1 ${status === "expired" ? "text-muted-foreground/30" : "text-muted-foreground/70"}`}>
                          {item.description}
                        </p>
                      )}

                      <div className="mt-2">
                        <VolatilityDots level={item.volatility} />
                      </div>
                    </div>

                    {/* Toggle alarme */}
                    <button onClick={() => toggleAlarm(item.id)}
                      className={`ml-4 w-14 h-7 rounded-full relative transition-all ${
                        status === "expired" ? "opacity-40 cursor-not-allowed" :
                        isOn ? "bg-primary" : "bg-secondary"
                      }`}
                      disabled={status === "expired"}>
                      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${
                        isOn ? "right-0.5" : "left-0.5"
                      }`} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="glass-card p-5 border border-primary/20 bg-primary/5 mt-8">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-semibold">💥 Dica The Magic Trader:</span>{" "}
                Ativa o alarme para receberes uma notificação 5 minutos antes de cada Hora do Boom!
              </p>
            </div>
          </motion.div>

        </div>
      </section>
    </Layout>
  );
}
