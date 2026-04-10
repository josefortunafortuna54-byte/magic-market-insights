import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Info, Zap } from "lucide-react";
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
}

function VolatilityBar({ level }: { level: number }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`h-3 w-5 rounded-sm ${i <= level ? "bg-primary" : "bg-secondary"}`} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {level === 5 ? "Muito Alta" : level === 4 ? "Alta" : level === 3 ? "Média" : level === 2 ? "Baixa" : "Muito Baixa"}
      </span>
    </div>
  );
}

export default function Horarios() {
  const [boomHours, setBoomHours] = useState<BoomHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("boom_hours")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      setBoomHours(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const now = new Date();
  const currentGMT = now.getUTCHours() + now.getUTCMinutes() / 60;

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl sm:text-3xl font-bold">⚡ Hora do Boom</h1>
            </div>
            <p className="text-muted-foreground text-sm mb-8 max-w-2xl">
              A equipa <span className="text-primary font-semibold">The Magic Trader</span> analisa o mercado 
              e identifica os melhores momentos para entrar — os períodos de maior volatilidade que chamamos de{" "}
              <span className="text-primary font-semibold">Hora do Boom</span>. Hora de Angola (WAT = GMT+1)
            </p>
          </motion.div>

          {/* Hora atual */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="glass-card p-4 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hora atual</p>
              <p className="font-display text-lg font-bold">
                {String(now.getUTCHours()).padStart(2, "0")}:{String(now.getUTCMinutes()).padStart(2, "0")} GMT
                <span className="text-sm text-muted-foreground ml-2">
                  ({String((now.getUTCHours() + 1) % 24).padStart(2, "0")}:{String(now.getUTCMinutes()).padStart(2, "0")} WAT)
                </span>
              </p>
            </div>
          </motion.div>

          {/* Boom Hours */}
          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">A carregar horários...</p>
            </div>
          ) : boomHours.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-display text-lg font-semibold mb-2">Sem horários publicados</h3>
              <p className="text-sm text-muted-foreground">
                A equipa The Magic Trader ainda não publicou horários de Hora do Boom.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {boomHours.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-5 border border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <h3 className="font-display font-semibold">{item.title}</h3>
                    </div>
                    {item.badge && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-sm text-muted-foreground">
                      🕐 GMT: <span className="text-foreground font-mono font-semibold">{item.time_gmt}</span>
                      <span className="mx-2">·</span>
                      WAT: <span className="text-foreground font-mono font-semibold">{item.time_wat}</span>
                    </p>
                    <VolatilityBar level={item.volatility} />
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
                  )}
                  {item.pairs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.pairs.map(pair => (
                        <span key={pair} className="text-xs bg-secondary/80 px-2 py-0.5 rounded-lg font-mono">{pair}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Dica */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="glass-card p-5 border border-primary/20 bg-primary/5">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">💥 Hora do Boom — Dica da equipa The Magic Trader</p>
                <p className="text-sm text-muted-foreground">
                  Os horários publicados aqui são analisados e selecionados pela equipa The Magic Trader 
                  com base nos melhores momentos de volatilidade do mercado Forex. 
                  Combina estes horários com os nossos sinais para maximizar os teus resultados.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
