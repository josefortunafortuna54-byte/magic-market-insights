import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Info, Bell } from "lucide-react";
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
  enabled: boolean;
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

export default function Horarios() {
  const [boomHours, setBoomHours] = useState<BoomHour[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();

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

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 max-w-lg">
          
          {/* Header estilo app de alarme */}
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
                {String((now.getUTCHours() + 1) % 24).padStart(2, "0")}:{String(now.getUTCMinutes()).padStart(2, "0")} WAT
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">GMT</p>
              <p className="font-mono text-sm text-muted-foreground">
                {String(now.getUTCHours()).padStart(2, "0")}:{String(now.getUTCMinutes()).padStart(2, "0")}
              </p>
            </div>
          </motion.div>

          {/* Lista de alarmes estilo relógio */}
          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">A carregar horários...</p>
            </div>
          ) : boomHours.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-display text-lg font-semibold mb-2">Sem horários publicados</h3>
              <p className="text-sm text-muted-foreground">A equipa ainda não publicou horários de Hora do Boom.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {boomHours.map((item, i) => {
                const [startWAT] = item.time_wat.split(" – ");
                const [h, m] = startWAT.split(":").map(Number);
                const currentWAT = (now.getUTCHours() + 1) % 24 + now.getUTCMinutes() / 60;
                const itemTime = h + (m || 0) / 60;
                const isNow = Math.abs(currentWAT - itemTime) < 0.5;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`border-b border-border/40 py-5 flex items-center justify-between ${isNow ? "bg-primary/5 px-3 rounded-xl" : ""}`}
                  >
                    {/* Lado esquerdo — hora grande */}
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className={`font-display text-5xl font-light tracking-tight ${item.enabled ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {startWAT}
                        </span>
                        {isNow && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold animate-pulse">
                            ● Agora
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.pairs.map(pair => (
                          <span key={pair} className={`font-mono text-sm font-semibold ${item.enabled ? "text-primary" : "text-muted-foreground/40"}`}>
                            {pair}
                          </span>
                        ))}
                        {item.badge && (
                          <span className="text-sm">{item.badge}</span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${item.enabled ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                        {item.days || "Todos os dias"} · GMT {item.time_gmt}
                      </p>
                      {item.description && (
                        <p className={`text-xs mt-1 ${item.enabled ? "text-muted-foreground/70" : "text-muted-foreground/30"}`}>
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2">
                        <VolatilityDots level={item.volatility} />
                      </div>
                    </div>

                    {/* Toggle */}
                    <div className="ml-4">
                      <div className={`w-14 h-7 rounded-full relative transition-all ${item.enabled ? "bg-primary" : "bg-secondary"}`}>
                        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${item.enabled ? "right-0.5" : "left-0.5"}`} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Dica */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="glass-card p-5 border border-primary/20 bg-primary/5 mt-8">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-semibold">💥 Dica The Magic Trader:</span>{" "}
                Combina estes horários com os nossos sinais para maximizar os teus resultados no mercado Forex.
              </p>
            </div>
          </motion.div>

        </div>
      </section>
    </Layout>
  );
}
