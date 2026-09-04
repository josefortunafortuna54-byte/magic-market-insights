import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, ChevronRight, Clock, Filter, Info, Settings2, SlidersHorizontal, Zap } from "lucide-react";
import { AlarmToggle } from "@/components/AlarmToggle";
import { EconomicEventsRow } from "@/components/economics/EconomicEventBadge";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useBoomHours } from "@/hooks/useBoomHours";
import { useEconomicCalendar } from "@/hooks/useEconomicCalendar";
import {
  DEFAULT_BOOM_PREFS,
  applyBoomPrefs,
  hasActiveFilters,
  loadBoomPrefs,
  type BoomPrefs,
} from "@/lib/boomPrefs";
import { boomEpochMs } from "@/lib/notifications";

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
  const { user } = useAuth();
  const { booms, loading } = useBoomHours();
  const { newsForBoom } = useEconomicCalendar();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<BoomPrefs>(DEFAULT_BOOM_PREFS);
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [currentTime, setCurrentTime] = useState(getWATTime());

  useEffect(() => {
    let active = true;
    void loadBoomPrefs(user?.id).then((p) => {
      if (active) setPrefs(p);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if ("Notification" in window) setNotifPermission(Notification.permission);
    const interval = setInterval(() => setCurrentTime(getWATTime()), 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredHours = useMemo(() => applyBoomPrefs(booms, prefs), [booms, prefs]);
  const hiddenCount = Math.max(0, booms.length - filteredHours.length);
  const filtersActive = hasActiveFilters(prefs);

  return (
    <Layout>
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 max-w-lg">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <Bell className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">⚡ Hora do Boom</h1>
              <button
                onClick={() => navigate("/definicoes-booms")}
                aria-label="Definições do Boom"
                className="ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Settings2 className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              Janelas de alta volatilidade. Ativa alarmes para não perderes a entrada.
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

          {/* Filtros ativos */}
          {filtersActive && (
            <button
              onClick={() => navigate("/definicoes-booms")}
              className="glass-card p-3 mb-4 w-full flex items-center gap-2 border border-primary/40 bg-primary/5 text-left"
            >
              <Filter className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-primary flex-1">
                Filtros ativos · {hiddenCount} boom(s) oculto(s)
              </span>
              <ChevronRight className="h-4 w-4 text-primary shrink-0" />
            </button>
          )}

          {loading ? (
            <div className="glass-card p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">A carregar horários…</p>
            </div>
          ) : booms.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="font-display text-lg font-semibold mb-2">Sem horários</h3>
              <p className="text-sm text-muted-foreground">Ainda não há horários ativos.</p>
            </div>
          ) : filteredHours.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-4">
              <div>
                <h3 className="font-display text-lg font-semibold mb-2">Sem booms nos filtros</h3>
                <p className="text-sm text-muted-foreground">
                  Nenhum boom corresponde aos teus filtros. Ajusta-os nas definições.
                </p>
              </div>
              <button
                onClick={() => navigate("/definicoes-booms")}
                className="inline-flex items-center gap-2 rounded-lg border border-accent/55 bg-accent/10 px-4 py-2 text-sm font-bold text-accent"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Ajustar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredHours.map((item, i) => {
                const status = getStatus(item.time_wat);
                const [startWAT] = item.time_wat.split(" – ");

                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`border-b border-border/40 py-5 ${status === "active" ? "bg-primary/5 px-3 rounded-xl border-primary/20" : ""}`}>

                    <div className="flex items-center justify-between">
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

                      {status === "expired" ? (
                        <span className="ml-4 shrink-0 text-xs text-muted-foreground/40">
                          Encerrado · o ciclo recomeça amanhã
                        </span>
                      ) : (
                        <div className="ml-4 shrink-0">
                          <AlarmToggle
                            boomId={item.id}
                            boomTime={new Date(boomEpochMs(new Date(), item.time_wat)).toISOString()}
                            title={item.title}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <EconomicEventsRow events={newsForBoom(item.time_wat, item.pairs)} />
                    </div>
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