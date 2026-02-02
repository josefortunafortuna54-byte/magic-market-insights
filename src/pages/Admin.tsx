import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Sparkles, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  Zap
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSignals, useCreateSignal, useGenerateSignal } from "@/hooks/useSignals";
import { useTradingPairs } from "@/hooks/useTradingPairs";
import { SignalCard } from "@/components/signals/SignalCard";

export default function Admin() {
  const { isAdmin } = useAuth();
  const { data: signals, isLoading: signalsLoading } = useSignals();
  const { data: pairs, isLoading: pairsLoading } = useTradingPairs();
  const createSignal = useCreateSignal();
  const generateSignal = useGenerateSignal();

  const [formData, setFormData] = useState({
    pair_id: "",
    signal_type: "BUY",
    timeframe: "H1",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    confidence: "",
    reasons: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createSignal.mutateAsync({
      pair_id: formData.pair_id,
      signal_type: formData.signal_type,
      timeframe: formData.timeframe,
      entry_price: parseFloat(formData.entry_price),
      stop_loss: parseFloat(formData.stop_loss),
      take_profit: parseFloat(formData.take_profit),
      confidence: parseInt(formData.confidence),
      reasons: formData.reasons.split("\n").filter(Boolean),
    });

    // Reset form
    setFormData({
      pair_id: "",
      signal_type: "BUY",
      timeframe: "H1",
      entry_price: "",
      stop_loss: "",
      take_profit: "",
      confidence: "",
      reasons: "",
    });
  };

  const handleGenerateSignal = async () => {
    await generateSignal.mutateAsync(formData.pair_id || undefined);
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </Layout>
    );
  }

  const activeSignals = signals?.filter(s => s.status === "active") || [];

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold mb-2">
                  Painel Admin
                </h1>
                <p className="text-muted-foreground">
                  Gerencie sinais e configurações do sistema
                </p>
              </div>
              <Link to="/configuracoes-ia">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Config. IA
                </Button>
              </Link>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Create Signal Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Criar Sinal Manual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pair">Par</Label>
                      <Select
                        value={formData.pair_id}
                        onValueChange={(v) => setFormData({ ...formData, pair_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pairs?.map((pair) => (
                            <SelectItem key={pair.id} value={pair.id}>
                              {pair.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select
                        value={formData.signal_type}
                        onValueChange={(v) => setFormData({ ...formData, signal_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">
                            <span className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-success" />
                              BUY
                            </span>
                          </SelectItem>
                          <SelectItem value="SELL">
                            <span className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-destructive" />
                              SELL
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeframe">Timeframe</Label>
                      <Select
                        value={formData.timeframe}
                        onValueChange={(v) => setFormData({ ...formData, timeframe: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M5">M5</SelectItem>
                          <SelectItem value="M15">M15</SelectItem>
                          <SelectItem value="H1">H1</SelectItem>
                          <SelectItem value="H4">H4</SelectItem>
                          <SelectItem value="D1">D1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confidence">Confiança (%)</Label>
                      <Input
                        id="confidence"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.confidence}
                        onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
                        placeholder="75"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entry">Entrada</Label>
                      <Input
                        id="entry"
                        type="number"
                        step="0.00001"
                        value={formData.entry_price}
                        onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                        placeholder="1.08450"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sl">Stop Loss</Label>
                      <Input
                        id="sl"
                        type="number"
                        step="0.00001"
                        value={formData.stop_loss}
                        onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                        placeholder="1.08200"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tp">Take Profit</Label>
                      <Input
                        id="tp"
                        type="number"
                        step="0.00001"
                        value={formData.take_profit}
                        onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                        placeholder="1.08950"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reasons">Razões (uma por linha)</Label>
                    <Textarea
                      id="reasons"
                      value={formData.reasons}
                      onChange={(e) => setFormData({ ...formData, reasons: e.target.value })}
                      placeholder="RSI em sobrevenda&#10;Suporte testado 3x&#10;Padrão de reversão"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createSignal.isPending || !formData.pair_id}
                    >
                      {createSignal.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Criar Sinal
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGenerateSignal}
                      disabled={generateSignal.isPending}
                    >
                      {generateSignal.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Gerar com IA
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Active Signals */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">
                  Sinais Ativos ({activeSignals.length})
                </h2>
              </div>

              {signalsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeSignals.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum sinal ativo. Crie um novo sinal ou gere com IA.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {activeSignals.slice(0, 5).map((signal, i) => (
                    <SignalCard key={signal.id} signal={signal} index={i} showDetails={false} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
