import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, 
  BarChart3, 
  Settings, 
  TrendingUp, 
  Crown,
  PlusCircle,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  Brain
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminUsers, useUpdateUserPlan, useToggleUserActive } from "@/hooks/useAdminUsers";
import { useAllTradingPairs } from "@/hooks/useTradingPairs";
import { useCreatePair, useUpdatePair, useDeletePair } from "@/hooks/useAdminPairs";
import { useAllSignals, useCreateSignal, useUpdateSignal, useDeleteSignal } from "@/hooks/useSignals";
import type { Database } from "@/integrations/supabase/types";

type PlanType = Database["public"]["Enums"]["plan_type"];

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, loading } = useAuth();
  
  const { data: users = [], refetch: refetchUsers } = useAdminUsers();
  const { data: pairs = [], refetch: refetchPairs } = useAllTradingPairs();
  const { data: signals = [], refetch: refetchSignals } = useAllSignals();
  
  const updateUserPlan = useUpdateUserPlan();
  const toggleUserActive = useToggleUserActive();
  const createPair = useCreatePair();
  const updatePair = useUpdatePair();
  const deletePair = useDeletePair();
  const createSignal = useCreateSignal();
  const updateSignal = useUpdateSignal();
  const deleteSignal = useDeleteSignal();

  // Dialog states
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [signalDialogOpen, setSignalDialogOpen] = useState(false);
  const [newPair, setNewPair] = useState({ symbol: "", name: "", category: "forex", is_premium: false });
  const [newSignal, setNewSignal] = useState({
    pair_id: "",
    signal_type: "BUY" as "BUY" | "SELL" | "WAIT",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    confidence: "75",
    timeframe: "H1",
  });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/dashboard");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) return null;

  const handleUpdatePlan = async (userId: string, plan: PlanType) => {
    try {
      await updateUserPlan.mutateAsync({ userId, plan });
      toast({ title: "Plano atualizado com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao atualizar plano", variant: "destructive" });
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await toggleUserActive.mutateAsync({ userId, isActive });
      toast({ title: isActive ? "Usuário ativado" : "Usuário desativado" });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleCreatePair = async () => {
    try {
      await createPair.mutateAsync(newPair);
      toast({ title: "Par criado com sucesso" });
      setPairDialogOpen(false);
      setNewPair({ symbol: "", name: "", category: "forex", is_premium: false });
    } catch (error) {
      toast({ title: "Erro ao criar par", variant: "destructive" });
    }
  };

  const handleTogglePairPremium = async (id: string, isPremium: boolean) => {
    try {
      await updatePair.mutateAsync({ id, is_premium: isPremium });
      toast({ title: "Par atualizado" });
    } catch (error) {
      toast({ title: "Erro ao atualizar par", variant: "destructive" });
    }
  };

  const handleTogglePairActive = async (id: string, isActive: boolean) => {
    try {
      await updatePair.mutateAsync({ id, is_active: isActive });
      toast({ title: isActive ? "Par ativado" : "Par desativado" });
    } catch (error) {
      toast({ title: "Erro ao atualizar par", variant: "destructive" });
    }
  };

  const handleCreateSignal = async () => {
    try {
      await createSignal.mutateAsync({
        ...newSignal,
        entry_price: parseFloat(newSignal.entry_price),
        stop_loss: parseFloat(newSignal.stop_loss),
        take_profit: parseFloat(newSignal.take_profit),
        confidence: parseInt(newSignal.confidence),
        created_by: user.id,
      });
      toast({ title: "Sinal criado com sucesso" });
      setSignalDialogOpen(false);
      setNewSignal({
        pair_id: "",
        signal_type: "BUY",
        entry_price: "",
        stop_loss: "",
        take_profit: "",
        confidence: "75",
        timeframe: "H1",
      });
    } catch (error) {
      toast({ title: "Erro ao criar sinal", variant: "destructive" });
    }
  };

  const handleCloseSignal = async (id: string, status: "tp" | "sl" | "cancelled") => {
    try {
      await updateSignal.mutateAsync({ 
        id, 
        status, 
        closed_at: new Date().toISOString() 
      });
      toast({ title: "Sinal encerrado" });
    } catch (error) {
      toast({ title: "Erro ao encerrar sinal", variant: "destructive" });
    }
  };

  const handleDeleteSignal = async (id: string) => {
    try {
      await deleteSignal.mutateAsync(id);
      toast({ title: "Sinal excluído" });
    } catch (error) {
      toast({ title: "Erro ao excluir sinal", variant: "destructive" });
    }
  };

  const activeSignals = signals.filter(s => s.status === "active");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                Painel do Administrador
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie usuários, pares e sinais da plataforma
              </p>
            </div>
            <Link to="/admin/ai-settings">
              <Button variant="outline" className="gap-2">
                <Brain className="h-4 w-4" />
                Configurações da IA
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Usuários", value: users.length, icon: Users, color: "text-primary" },
            { label: "Pares Ativos", value: pairs.filter(p => p.is_active).length, icon: TrendingUp, color: "text-success" },
            { label: "Sinais Ativos", value: activeSignals.length, icon: BarChart3, color: "text-warning" },
            { label: "Premium", value: users.filter(u => u.plan === "premium").length, icon: Crown, color: "text-amber-500" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`font-display text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="pairs" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Pares
            </TabsTrigger>
            <TabsTrigger value="signals" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Sinais
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-display font-semibold">Gestão de Usuários</h3>
                <Button variant="ghost" size="sm" onClick={() => refetchUsers()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left p-4 text-sm font-medium">Usuário</th>
                      <th className="text-left p-4 text-sm font-medium">Email</th>
                      <th className="text-left p-4 text-sm font-medium">Plano</th>
                      <th className="text-left p-4 text-sm font-medium">Status</th>
                      <th className="text-left p-4 text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/20">
                        <td className="p-4">{u.full_name || "Sem nome"}</td>
                        <td className="p-4 text-muted-foreground">{u.email}</td>
                        <td className="p-4">
                          <Select
                            value={u.plan}
                            onValueChange={(value: PlanType) => handleUpdatePlan(u.user_id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <Badge variant={u.is_active ? "success" : "destructive"}>
                            {u.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Switch
                            checked={u.is_active}
                            onCheckedChange={(checked) => handleToggleActive(u.user_id, checked)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Pairs Tab */}
          <TabsContent value="pairs" className="mt-6">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-display font-semibold">Gestão de Pares</h3>
                <Dialog open={pairDialogOpen} onOpenChange={setPairDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Novo Par
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Par</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Símbolo</Label>
                        <Input
                          placeholder="EURUSD"
                          value={newPair.symbol}
                          onChange={(e) => setNewPair({ ...newPair, symbol: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          placeholder="Euro / US Dollar"
                          value={newPair.name}
                          onChange={(e) => setNewPair({ ...newPair, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select
                          value={newPair.category}
                          onValueChange={(value) => setNewPair({ ...newPair, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="forex">Forex</SelectItem>
                            <SelectItem value="commodity">Commodity</SelectItem>
                            <SelectItem value="crypto">Crypto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newPair.is_premium}
                          onCheckedChange={(checked) => setNewPair({ ...newPair, is_premium: checked })}
                        />
                        <Label>Premium</Label>
                      </div>
                      <Button onClick={handleCreatePair} className="w-full">
                        Criar Par
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left p-4 text-sm font-medium">Símbolo</th>
                      <th className="text-left p-4 text-sm font-medium">Nome</th>
                      <th className="text-left p-4 text-sm font-medium">Categoria</th>
                      <th className="text-left p-4 text-sm font-medium">Premium</th>
                      <th className="text-left p-4 text-sm font-medium">Ativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((pair) => (
                      <tr key={pair.id} className="border-b border-border/30 hover:bg-secondary/20">
                        <td className="p-4 font-semibold">{pair.symbol}</td>
                        <td className="p-4 text-muted-foreground">{pair.name}</td>
                        <td className="p-4">
                          <Badge variant="outline">{pair.category}</Badge>
                        </td>
                        <td className="p-4">
                          <Switch
                            checked={pair.is_premium}
                            onCheckedChange={(checked) => handleTogglePairPremium(pair.id, checked)}
                          />
                        </td>
                        <td className="p-4">
                          <Switch
                            checked={pair.is_active}
                            onCheckedChange={(checked) => handleTogglePairActive(pair.id, checked)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="mt-6">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-display font-semibold">Gestão de Sinais</h3>
                <Dialog open={signalDialogOpen} onOpenChange={setSignalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Novo Sinal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Sinal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Par</Label>
                        <Select
                          value={newSignal.pair_id}
                          onValueChange={(value) => setNewSignal({ ...newSignal, pair_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o par" />
                          </SelectTrigger>
                          <SelectContent>
                            {pairs.filter(p => p.is_active).map((pair) => (
                              <SelectItem key={pair.id} value={pair.id}>
                                {pair.symbol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={newSignal.signal_type}
                            onValueChange={(value: "BUY" | "SELL" | "WAIT") => 
                              setNewSignal({ ...newSignal, signal_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BUY">BUY</SelectItem>
                              <SelectItem value="SELL">SELL</SelectItem>
                              <SelectItem value="WAIT">WAIT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Timeframe</Label>
                          <Select
                            value={newSignal.timeframe}
                            onValueChange={(value) => setNewSignal({ ...newSignal, timeframe: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M5">M5</SelectItem>
                              <SelectItem value="M15">M15</SelectItem>
                              <SelectItem value="H1">H1</SelectItem>
                              <SelectItem value="H4">H4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Preço de Entrada</Label>
                        <Input
                          type="number"
                          step="0.00001"
                          placeholder="1.08450"
                          value={newSignal.entry_price}
                          onChange={(e) => setNewSignal({ ...newSignal, entry_price: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Stop Loss</Label>
                          <Input
                            type="number"
                            step="0.00001"
                            placeholder="1.08200"
                            value={newSignal.stop_loss}
                            onChange={(e) => setNewSignal({ ...newSignal, stop_loss: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Take Profit</Label>
                          <Input
                            type="number"
                            step="0.00001"
                            placeholder="1.08900"
                            value={newSignal.take_profit}
                            onChange={(e) => setNewSignal({ ...newSignal, take_profit: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Confiança (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={newSignal.confidence}
                          onChange={(e) => setNewSignal({ ...newSignal, confidence: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleCreateSignal} className="w-full">
                        Criar Sinal
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left p-4 text-sm font-medium">Par</th>
                      <th className="text-left p-4 text-sm font-medium">Tipo</th>
                      <th className="text-left p-4 text-sm font-medium">Entrada</th>
                      <th className="text-left p-4 text-sm font-medium">SL</th>
                      <th className="text-left p-4 text-sm font-medium">TP</th>
                      <th className="text-left p-4 text-sm font-medium">Confiança</th>
                      <th className="text-left p-4 text-sm font-medium">Status</th>
                      <th className="text-left p-4 text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((signal) => (
                      <tr key={signal.id} className="border-b border-border/30 hover:bg-secondary/20">
                        <td className="p-4 font-semibold">{signal.trading_pairs?.symbol}</td>
                        <td className="p-4">
                          <Badge variant={signal.signal_type === "BUY" ? "success" : signal.signal_type === "SELL" ? "destructive" : "secondary"}>
                            {signal.signal_type}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono text-sm">{signal.entry_price.toFixed(5)}</td>
                        <td className="p-4 font-mono text-sm text-destructive">{signal.stop_loss.toFixed(5)}</td>
                        <td className="p-4 font-mono text-sm text-primary">{signal.take_profit.toFixed(5)}</td>
                        <td className="p-4">{signal.confidence}%</td>
                        <td className="p-4">
                          <Badge variant={
                            signal.status === "active" ? "default" :
                            signal.status === "tp" ? "success" :
                            signal.status === "sl" ? "destructive" : "secondary"
                          }>
                            {signal.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {signal.status === "active" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-success hover:text-success"
                                onClick={() => handleCloseSignal(signal.id, "tp")}
                                title="Fechar como TP"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleCloseSignal(signal.id, "sl")}
                                title="Fechar como SL"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteSignal(signal.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
