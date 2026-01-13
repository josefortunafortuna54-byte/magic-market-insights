import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, BarChart3, History, Settings, Lock } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { TradingViewChart } from "@/components/trading/TradingViewChart";
import { PriceTicker } from "@/components/trading/PriceTicker";
import { SignalCard } from "@/components/trading/SignalCard";
import { PairSelector } from "@/components/trading/PairSelector";
import { TimeframeSelector } from "@/components/trading/TimeframeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { useSignals } from "@/hooks/useSignals";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isPremium, loading } = useAuth();
  const { data: pairs = [] } = useTradingPairs();
  const { data: signals = [] } = useSignals();
  
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState("60");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  // Filter pairs based on plan
  const accessiblePairs = pairs.filter(p => !p.is_premium || isPremium);
  const tickerSymbols = accessiblePairs.map(p => p.symbol);
  
  // Filter signals based on plan
  const activeSignals = signals.filter(s => s.status === "active");
  const historySignals = signals.filter(s => s.status !== "active");

  const canAccessPair = (symbol: string) => {
    const pair = pairs.find(p => p.symbol === symbol);
    return pair ? (!pair.is_premium || isPremium) : true;
  };

  return (
    <Layout>
      {/* Price Ticker */}
      <PriceTicker symbols={tickerSymbols.length > 0 ? tickerSymbols : ["EURUSD"]} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Olá, {profile?.full_name || "Trader"} 👋
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isPremium ? "default" : "secondary"}>
                {isPremium ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </>
                ) : (
                  "Free"
                )}
              </Badge>
              {!isPremium && (
                <Link to="/planos">
                  <Button variant="premium" size="sm">
                    <Crown className="h-3 w-3 mr-1" />
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* Chart Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 mb-6"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <PairSelector
              pairs={pairs}
              selectedPair={selectedPair}
              onSelect={(symbol) => {
                if (canAccessPair(symbol)) {
                  setSelectedPair(symbol);
                }
              }}
            />
            <TimeframeSelector
              selected={selectedTimeframe}
              onSelect={setSelectedTimeframe}
            />
          </div>
        </motion.div>

        {/* Main Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {canAccessPair(selectedPair) ? (
            <TradingViewChart
              symbol={selectedPair}
              interval={selectedTimeframe}
              className="min-h-[400px] md:min-h-[650px]"
            />
          ) : (
            <div className="glass-card min-h-[400px] md:min-h-[650px] flex flex-col items-center justify-center">
              <Lock className="h-16 w-16 text-warning mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">Conteúdo Premium</h3>
              <p className="text-muted-foreground mb-4">
                Atualize para Premium para acessar {selectedPair}
              </p>
              <Link to="/planos">
                <Button variant="premium">
                  <Crown className="h-4 w-4 mr-2" />
                  Tornar-se Premium
                </Button>
              </Link>
            </div>
          )}
        </motion.div>

        {/* Signals Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Sinais Ativos ({activeSignals.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Histórico ({historySignals.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-6">
              {activeSignals.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold mb-2">
                    Nenhum sinal ativo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Novos sinais serão exibidos aqui em tempo real.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeSignals.map((signal, i) => {
                    const pair = signal.trading_pairs;
                    const isLocked = pair?.is_premium && !isPremium;
                    return (
                      <SignalCard
                        key={signal.id}
                        signal={signal}
                        index={i}
                        isPremiumLocked={isLocked}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              {historySignals.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold mb-2">
                    Sem histórico
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sinais finalizados aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {historySignals.map((signal, i) => {
                    const pair = signal.trading_pairs;
                    const isLocked = pair?.is_premium && !isPremium;
                    return (
                      <SignalCard
                        key={signal.id}
                        signal={signal}
                        index={i}
                        isPremiumLocked={isLocked}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  );
}
