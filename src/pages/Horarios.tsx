import { motion } from "framer-motion";
import { Clock, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

const sessions = [
  {
    name: "Sessão de Sydney",
    time: "21:00 – 06:00 GMT",
    localTime: "22:00 – 07:00 WAT",
    color: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    dot: "bg-blue-400",
    volatility: 2,
    pairs: ["AUD/USD", "NZD/USD", "AUD/JPY"],
    description: "Mercado calmo, menor volatilidade. Bom para scalping em pares australianos.",
  },
  {
    name: "Sessão de Tóquio",
    time: "00:00 – 09:00 GMT",
    localTime: "01:00 – 10:00 WAT",
    color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    dot: "bg-yellow-400",
    volatility: 3,
    pairs: ["USD/JPY", "EUR/JPY", "GBP/JPY"],
    description: "Boa volatilidade nos pares JPY. Dados económicos japoneses movem o mercado.",
  },
  {
    name: "Sessão de Londres",
    time: "08:00 – 17:00 GMT",
    localTime: "09:00 – 18:00 WAT",
    color: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    dot: "bg-purple-400",
    volatility: 5,
    pairs: ["EUR/USD", "GBP/USD", "EUR/GBP", "USD/CHF"],
    description: "Maior sessão de Forex. Alta liquidez e volatilidade. Melhor período para trading.",
  },
  {
    name: "Sessão de Nova Iorque",
    time: "13:00 – 22:00 GMT",
    localTime: "14:00 – 23:00 WAT",
    color: "bg-green-500/10 border-green-500/30 text-green-400",
    dot: "bg-green-400",
    volatility: 4,
    pairs: ["EUR/USD", "USD/CAD", "USD/JPY", "GBP/USD"],
    description: "Segunda maior sessão. Dados económicos dos EUA causam grandes movimentos.",
  },
];

const overlap = [
  {
    name: "Londres + Nova Iorque",
    time: "13:00 – 17:00 GMT",
    localTime: "14:00 – 18:00 WAT",
    volatility: 5,
    description: "O período mais volátil do dia. Volume máximo de transações. Ideal para day trading.",
    pairs: ["EUR/USD", "GBP/USD", "USD/JPY"],
    badge: "🔥 Melhor Período",
    color: "border-primary/50 bg-primary/5",
  },
  {
    name: "Tóquio + Londres",
    time: "08:00 – 09:00 GMT",
    localTime: "09:00 – 10:00 WAT",
    volatility: 4,
    description: "Abertura europeia com liquidez asiática ainda ativa. Bons movimentos nos pares EUR e JPY.",
    pairs: ["EUR/JPY", "GBP/JPY", "EUR/USD"],
    badge: "⚡ Alta Volatilidade",
    color: "border-yellow-500/30 bg-yellow-500/5",
  },
];

const keyTimes = [
  { time: "08:30 GMT", event: "Abertura de Londres", impact: "alto", pairs: "EUR/USD, GBP/USD" },
  { time: "09:00 GMT", event: "Dados económicos europeus", impact: "alto", pairs: "EUR/*, GBP/*" },
  { time: "13:00 GMT", event: "Abertura de Nova Iorque", impact: "alto", pairs: "Todos os pares USD" },
  { time: "13:30 GMT", event: "Dados económicos dos EUA (NFP, CPI)", impact: "muito alto", pairs: "EUR/USD, USD/JPY" },
  { time: "15:00 GMT", event: "Pico de liquidez global", impact: "alto", pairs: "Todos os pares" },
  { time: "17:00 GMT", event: "Fecho de Londres", impact: "médio", pairs: "EUR/*, GBP/*" },
  { time: "21:00 GMT", event: "Fecho de Nova Iorque", impact: "médio", pairs: "Pares USD" },
  { time: "00:00 GMT", event: "Abertura de Tóquio", impact: "médio", pairs: "JPY, AUD, NZD" },
];

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
  const now = new Date();
  const gmtHour = now.getUTCHours();
  const gmtMin = now.getUTCMinutes();
  const currentGMT = gmtHour + gmtMin / 60;

  const isSessionActive = (timeStr: string) => {
    const [start, end] = timeStr.split(" – ").map(t => {
      const [h] = t.split(":").map(Number);
      return h;
    });
    if (start < end) return currentGMT >= start && currentGMT < end;
    return currentGMT >= start || currentGMT < end;
  };

  return (
    <Layout>
      <section className="pt-8 pb-6">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl sm:text-3xl font-bold">Horários de Grandes Movimentos</h1>
            </div>
            <p className="text-muted-foreground text-sm mb-8">
              Sessões de mercado e períodos de maior volatilidade no Forex — hora de Angola (WAT = GMT+1)
            </p>
          </motion.div>

          {/* Hora atual */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="glass-card p-4 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hora atual (GMT)</p>
              <p className="font-display text-lg font-bold">
                {String(now.getUTCHours()).padStart(2, "0")}:{String(now.getUTCMinutes()).padStart(2, "0")} GMT
                <span className="text-sm text-muted-foreground ml-2">
                  ({String((now.getUTCHours() + 1) % 24).padStart(2, "0")}:{String(now.getUTCMinutes()).padStart(2, "0")} WAT)
                </span>
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Sessão ativa</p>
              <p className="text-sm font-semibold text-primary">
                {sessions.filter(s => isSessionActive(s.time)).map(s => s.name).join(" + ") || "Mercado calmo"}
              </p>
            </div>
          </motion.div>

          {/* Sessões */}
          <h2 className="font-display text-lg font-bold mb-4">Sessões de Mercado</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {sessions.map((session, i) => {
              const active = isSessionActive(session.time);
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass-card p-5 border ${session.color} ${active ? "ring-2 ring-primary/50" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${session.dot} ${active ? "animate-pulse" : "opacity-40"}`} />
                      <h3 className="font-display font-semibold">{session.name}</h3>
                    </div>
                    {active && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-semibold">
                        ● Ativa agora
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-sm text-muted-foreground">
                      🕐 <span className="text-foreground font-mono">{session.time}</span>
                      <span className="ml-2 text-xs">({session.localTime})</span>
                    </p>
                    <VolatilityBar level={session.volatility} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{session.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {session.pairs.map(pair => (
                      <span key={pair} className="text-xs bg-secondary/80 px-2 py-0.5 rounded-lg font-mono">{pair}</span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Sobreposições */}
          <h2 className="font-display text-lg font-bold mb-4">⚡ Períodos de Sobreposição</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {overlap.map((o, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-5 border ${o.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold">{o.name}</h3>
                  <span className="text-xs font-semibold">{o.badge}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  🕐 <span className="text-foreground font-mono">{o.time}</span>
                  <span className="ml-2 text-xs">({o.localTime})</span>
                </p>
                <VolatilityBar level={o.volatility} />
                <p className="text-xs text-muted-foreground my-3">{o.description}</p>
                <div className="flex flex-wrap gap-1">
                  {o.pairs.map(pair => (
                    <span key={pair} className="text-xs bg-secondary/80 px-2 py-0.5 rounded-lg font-mono">{pair}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Horários chave */}
          <h2 className="font-display text-lg font-bold mb-4">🎯 Horários Chave por Dia</h2>
          <div className="glass-card overflow-hidden mb-10">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-xs text-muted-foreground">Hora GMT</th>
                    <th className="text-left p-4 text-xs text-muted-foreground">Hora Angola</th>
                    <th className="text-left p-4 text-xs text-muted-foreground">Evento</th>
                    <th className="text-left p-4 text-xs text-muted-foreground">Impacto</th>
                    <th className="text-left p-4 text-xs text-muted-foreground">Pares</th>
                  </tr>
                </thead>
                <tbody>
                  {keyTimes.map((kt, i) => {
                    const gmtH = parseInt(kt.time.split(":")[0]);
                    const watH = (gmtH + 1) % 24;
                    const isNow = Math.abs(currentGMT - gmtH) < 0.5;
                    return (
                      <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${isNow ? "bg-primary/5" : ""}`}>
                        <td className="p-4 font-mono font-semibold text-primary">{kt.time}</td>
                        <td className="p-4 font-mono text-muted-foreground">
                          {String(watH).padStart(2, "0")}:{kt.time.split(":")[1]} WAT
                        </td>
                        <td className="p-4 font-medium">{kt.event}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                            kt.impact === "muito alto" ? "bg-destructive/20 text-destructive" :
                            kt.impact === "alto" ? "bg-warning/20 text-warning" :
                            "bg-secondary text-muted-foreground"
                          }`}>
                            {kt.impact}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground font-mono">{kt.pairs}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dica */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="glass-card p-5 border border-primary/20 bg-primary/5">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">Dica para traders angolanos</p>
                <p className="text-sm text-muted-foreground">
                  O melhor horário para trading em Angola (WAT) é entre as <strong>14:00 e 18:00</strong> — 
                  sobreposição das sessões de Londres e Nova Iorque. É quando o mercado tem mais liquidez 
                  e os sinais do Magic Trader têm maior probabilidade de sucesso.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
