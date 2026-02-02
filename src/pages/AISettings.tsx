import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Save, Loader2, RotateCcw } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAISettings, AISettingsData } from "@/hooks/useAISettings";
import { useAuth } from "@/contexts/AuthContext";

const DEFAULT_SETTINGS: AISettingsData = {
  rsi_oversold: 30,
  rsi_overbought: 70,
  ema_short: 21,
  ema_long: 50,
  min_confidence: 60,
  default_timeframe: "H1",
  sl_pips: 25,
  tp_multiplier: 2,
};

export default function AISettings() {
  const { isAdmin } = useAuth();
  const { settings, isLoading, updateSettings, isSaving } = useAISettings();
  const [formData, setFormData] = useState<AISettingsData>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
  };

  const handleReset = () => {
    setFormData(DEFAULT_SETTINGS);
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

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-8 w-8 text-primary" />
              <h1 className="font-display text-3xl font-bold">
                Configurações da IA
              </h1>
            </div>
            <p className="text-muted-foreground">
              Ajuste os parâmetros técnicos usados na geração de sinais
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* RSI Settings */}
            <Card>
              <CardHeader>
                <CardTitle>RSI (Relative Strength Index)</CardTitle>
                <CardDescription>
                  Defina os limites de sobrevenda e sobrecompra
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>RSI Sobrevenda</Label>
                      <span className="text-sm font-mono text-primary">{formData.rsi_oversold}</span>
                    </div>
                    <Slider
                      value={[formData.rsi_oversold]}
                      onValueChange={([v]) => setFormData({ ...formData, rsi_oversold: v })}
                      min={10}
                      max={50}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Valores abaixo indicam condição de sobrevenda (BUY)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>RSI Sobrecompra</Label>
                      <span className="text-sm font-mono text-primary">{formData.rsi_overbought}</span>
                    </div>
                    <Slider
                      value={[formData.rsi_overbought]}
                      onValueChange={([v]) => setFormData({ ...formData, rsi_overbought: v })}
                      min={50}
                      max={90}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Valores acima indicam condição de sobrecompra (SELL)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* EMA Settings */}
            <Card>
              <CardHeader>
                <CardTitle>EMAs (Médias Móveis Exponenciais)</CardTitle>
                <CardDescription>
                  Configure os períodos das EMAs para análise de tendência
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ema_short">EMA Curta (períodos)</Label>
                  <Input
                    id="ema_short"
                    type="number"
                    min={5}
                    max={50}
                    value={formData.ema_short}
                    onChange={(e) => setFormData({ ...formData, ema_short: parseInt(e.target.value) || 21 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ema_long">EMA Longa (períodos)</Label>
                  <Input
                    id="ema_long"
                    type="number"
                    min={20}
                    max={200}
                    value={formData.ema_long}
                    onChange={(e) => setFormData({ ...formData, ema_long: parseInt(e.target.value) || 50 })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Signal Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Parâmetros de Sinal</CardTitle>
                <CardDescription>
                  Configure confiança mínima, timeframe e gestão de risco
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Confiança Mínima</Label>
                      <span className="text-sm font-mono text-primary">{formData.min_confidence}%</span>
                    </div>
                    <Slider
                      value={[formData.min_confidence]}
                      onValueChange={([v]) => setFormData({ ...formData, min_confidence: v })}
                      min={50}
                      max={95}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sinais abaixo deste limite serão marcados como AGUARDAR
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeframe">Timeframe Padrão</Label>
                    <Select
                      value={formData.default_timeframe}
                      onValueChange={(v) => setFormData({ ...formData, default_timeframe: v })}
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
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sl_pips">Stop Loss (pips)</Label>
                    <Input
                      id="sl_pips"
                      type="number"
                      min={10}
                      max={100}
                      value={formData.sl_pips}
                      onChange={(e) => setFormData({ ...formData, sl_pips: parseInt(e.target.value) || 25 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tp_multiplier">Multiplicador TP (RR)</Label>
                    <Input
                      id="tp_multiplier"
                      type="number"
                      min={1}
                      max={5}
                      step={0.5}
                      value={formData.tp_multiplier}
                      onChange={(e) => setFormData({ ...formData, tp_multiplier: parseFloat(e.target.value) || 2 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Take Profit = Stop Loss × {formData.tp_multiplier}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrões
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
