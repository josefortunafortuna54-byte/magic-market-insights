import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  Settings,
  Save,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAISettings, useUpdateAISettings, useUpdatePairOverride, AISettings } from "@/hooks/useAISettings";
import { useAllTradingPairs } from "@/hooks/useTradingPairs";

const TIMEFRAME_OPTIONS = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];

export default function AISettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { data: settings, isLoading } = useAISettings();
  const { data: pairs = [] } = useAllTradingPairs();
  const updateSettings = useUpdateAISettings();
  const updatePairOverride = useUpdatePairOverride();

  const [localSettings, setLocalSettings] = useState<AISettings | null>(null);
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  if (authLoading || isLoading || !localSettings) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) return null;

  const handleSettingChange = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setLocalSettings((prev) => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  const handleTimeframeToggle = (timeframe: string) => {
    const current = localSettings.enabled_timeframes;
    const updated = current.includes(timeframe)
      ? current.filter((t) => t !== timeframe)
      : [...current, timeframe];
    handleSettingChange("enabled_timeframes", updated);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
      setHasChanges(false);
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  };

  const togglePairExpanded = (symbol: string) => {
    const newExpanded = new Set(expandedPairs);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedPairs(newExpanded);
  };

  const handlePairOverride = async (symbol: string, key: string, value: number) => {
    const currentOverride = localSettings.pair_overrides[symbol] || {};
    const newOverride = { ...currentOverride, [key]: value };
    
    try {
      await updatePairOverride.mutateAsync({ symbol, override: newOverride });
      setLocalSettings((prev) => prev ? {
        ...prev,
        pair_overrides: { ...prev.pair_overrides, [symbol]: newOverride }
      } : null);
      toast({ title: `Configuração de ${symbol} atualizada` });
    } catch (error) {
      toast({ title: "Erro ao atualizar configuração", variant: "destructive" });
    }
  };

  const handleRemovePairOverride = async (symbol: string) => {
    try {
      await updatePairOverride.mutateAsync({ symbol, override: null });
      setLocalSettings((prev) => {
        if (!prev) return null;
        const newOverrides = { ...prev.pair_overrides };
        delete newOverrides[symbol];
        return { ...prev, pair_overrides: newOverrides };
      });
      toast({ title: `Configuração personalizada de ${symbol} removida` });
    } catch (error) {
      toast({ title: "Erro ao remover configuração", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                Configurações da IA
              </h1>
              <p className="text-muted-foreground mt-2">
                Ajuste os parâmetros de análise técnica e geração de sinais
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateSettings.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettings.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="indicators" className="gap-2">
              <Activity className="h-4 w-4" />
              Indicadores
            </TabsTrigger>
            <TabsTrigger value="pairs" className="gap-2">
              <Sliders className="h-4 w-4" />
              Por Par
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Timeframes */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Timeframes
                  </CardTitle>
                  <CardDescription>
                    Selecione os timeframes habilitados para análise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {TIMEFRAME_OPTIONS.map((tf) => (
                      <Badge
                        key={tf}
                        variant={localSettings.enabled_timeframes.includes(tf) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => handleTimeframeToggle(tf)}
                      >
                        {tf}
                      </Badge>
                    ))}
                  </div>
                  <div className="pt-4">
                    <Label className="text-sm text-muted-foreground">Timeframe Padrão</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {localSettings.enabled_timeframes.map((tf) => (
                        <Badge
                          key={tf}
                          variant={localSettings.default_timeframe === tf ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleSettingChange("default_timeframe", tf)}
                        >
                          {tf}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Confidence Thresholds */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Confiança Mínima
                  </CardTitle>
                  <CardDescription>
                    Define o limite mínimo de confiança para emitir sinais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        BUY
                      </Label>
                      <span className="font-mono text-sm">{localSettings.min_confidence_buy}%</span>
                    </div>
                    <Slider
                      value={[localSettings.min_confidence_buy]}
                      onValueChange={([v]) => handleSettingChange("min_confidence_buy", v)}
                      min={50}
                      max={95}
                      step={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        SELL
                      </Label>
                      <span className="font-mono text-sm">{localSettings.min_confidence_sell}%</span>
                    </div>
                    <Slider
                      value={[localSettings.min_confidence_sell]}
                      onValueChange={([v]) => handleSettingChange("min_confidence_sell", v)}
                      min={50}
                      max={95}
                      step={5}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Risk Management */}
              <Card className="glass-card md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-warning" />
                    Gestão de Risco
                  </CardTitle>
                  <CardDescription>
                    Configurações padrão de Stop Loss e Take Profit (em %)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Stop Loss (%)</Label>
                        <span className="font-mono text-sm text-destructive">
                          -{localSettings.stop_loss_percent}%
                        </span>
                      </div>
                      <Slider
                        value={[localSettings.stop_loss_percent]}
                        onValueChange={([v]) => handleSettingChange("stop_loss_percent", v)}
                        min={0.1}
                        max={5}
                        step={0.1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Distância do preço de entrada para o Stop Loss
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Take Profit (%)</Label>
                        <span className="font-mono text-sm text-success">
                          +{localSettings.take_profit_percent}%
                        </span>
                      </div>
                      <Slider
                        value={[localSettings.take_profit_percent]}
                        onValueChange={([v]) => handleSettingChange("take_profit_percent", v)}
                        min={0.1}
                        max={10}
                        step={0.1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Distância do preço de entrada para o Take Profit
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Indicators Settings */}
          <TabsContent value="indicators" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* RSI Settings */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    RSI (Relative Strength Index)
                  </CardTitle>
                  <CardDescription>
                    Configurações do indicador RSI para identificar sobrecompra/sobrevenda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Período RSI</Label>
                      <Input
                        type="number"
                        value={localSettings.rsi_period}
                        onChange={(e) => handleSettingChange("rsi_period", parseInt(e.target.value) || 14)}
                        className="w-20 text-center"
                        min={5}
                        max={50}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Número de períodos para cálculo do RSI (padrão: 14)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-success">Sobrevendido (BUY)</Label>
                      <span className="font-mono text-sm">&lt; {localSettings.rsi_oversold}</span>
                    </div>
                    <Slider
                      value={[localSettings.rsi_oversold]}
                      onValueChange={([v]) => handleSettingChange("rsi_oversold", v)}
                      min={10}
                      max={40}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      RSI abaixo deste valor indica mercado sobrevendido (sinal de compra)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-destructive">Sobrecomprado (SELL)</Label>
                      <span className="font-mono text-sm">&gt; {localSettings.rsi_overbought}</span>
                    </div>
                    <Slider
                      value={[localSettings.rsi_overbought]}
                      onValueChange={([v]) => handleSettingChange("rsi_overbought", v)}
                      min={60}
                      max={90}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      RSI acima deste valor indica mercado sobrecomprado (sinal de venda)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* EMA Settings */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    EMA (Exponential Moving Average)
                  </CardTitle>
                  <CardDescription>
                    Configurações da média móvel exponencial para tendência
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Período EMA</Label>
                      <Input
                        type="number"
                        value={localSettings.ema_period}
                        onChange={(e) => handleSettingChange("ema_period", parseInt(e.target.value) || 20)}
                        className="w-20 text-center"
                        min={5}
                        max={200}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Número de períodos para cálculo da EMA (padrão: 20)
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
                    <h4 className="font-medium text-sm">Lógica de Sinal</h4>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <strong className="text-success">BUY:</strong> Preço &gt; EMA + RSI sobrevendido
                      </p>
                      <p className="flex items-center gap-2">
                        <TrendingDown className="h-3 w-3 text-destructive" />
                        <strong className="text-destructive">SELL:</strong> Preço &lt; EMA + RSI sobrecomprado
                      </p>
                      <p className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-warning" />
                        <strong className="text-warning">HOLD:</strong> Condições não confirmadas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Per-Pair Settings */}
          <TabsContent value="pairs" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" />
                  Configurações por Par
                </CardTitle>
                <CardDescription>
                  Personalize os parâmetros de análise para cada par de trading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pairs.filter(p => p.is_active).map((pair) => {
                  const override = localSettings.pair_overrides[pair.symbol] || {};
                  const hasOverride = Object.keys(override).length > 0;
                  const isExpanded = expandedPairs.has(pair.symbol);

                  return (
                    <Collapsible
                      key={pair.id}
                      open={isExpanded}
                      onOpenChange={() => togglePairExpanded(pair.symbol)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-semibold">{pair.symbol}</span>
                            <Badge variant="outline" className="text-xs">
                              {pair.category}
                            </Badge>
                            {pair.is_premium && (
                              <Badge variant="secondary" className="text-xs">
                                Premium
                              </Badge>
                            )}
                          </div>
                          {hasOverride && (
                            <Badge variant="default" className="text-xs">
                              Personalizado
                            </Badge>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 pb-2 px-4 space-y-4">
                        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">RSI Sobrevendido</Label>
                            <Input
                              type="number"
                              placeholder={String(localSettings.rsi_oversold)}
                              value={override.rsi_oversold ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : localSettings.rsi_oversold;
                                handlePairOverride(pair.symbol, "rsi_oversold", val);
                              }}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">RSI Sobrecomprado</Label>
                            <Input
                              type="number"
                              placeholder={String(localSettings.rsi_overbought)}
                              value={override.rsi_overbought ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : localSettings.rsi_overbought;
                                handlePairOverride(pair.symbol, "rsi_overbought", val);
                              }}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Período EMA</Label>
                            <Input
                              type="number"
                              placeholder={String(localSettings.ema_period)}
                              value={override.ema_period ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : localSettings.ema_period;
                                handlePairOverride(pair.symbol, "ema_period", val);
                              }}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Confiança Min (%)</Label>
                            <Input
                              type="number"
                              placeholder={String(localSettings.min_confidence_buy)}
                              value={override.min_confidence_buy ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : localSettings.min_confidence_buy;
                                handlePairOverride(pair.symbol, "min_confidence_buy", val);
                              }}
                              className="h-8"
                            />
                          </div>
                        </div>
                        {hasOverride && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemovePairOverride(pair.symbol)}
                          >
                            Remover configuração personalizada
                          </Button>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
