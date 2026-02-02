import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DatabaseSignal {
  id: string;
  pair_id: string;
  signal_type: string;
  timeframe: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  reasons: string[] | null;
  status: string;
  created_at: string;
  created_by: string | null;
  closed_at: string | null;
}

export interface SignalWithPair extends DatabaseSignal {
  trading_pairs: {
    symbol: string;
    name: string;
    category: string;
  };
}

// Transform database signal to UI format
export function transformSignal(signal: SignalWithPair) {
  return {
    id: signal.id,
    pair: signal.trading_pairs?.symbol || "Unknown",
    timeframe: signal.timeframe,
    type: signal.signal_type as "BUY" | "SELL" | "AGUARDAR",
    confidence: signal.confidence,
    entry: signal.entry_price,
    stopLoss: signal.stop_loss,
    takeProfit: signal.take_profit,
    reasons: signal.reasons || [],
    createdAt: signal.created_at,
    status: signal.status as "active" | "tp" | "sl",
    source: signal.created_by ? "ADMIN" : "AI",
  };
}

export function useSignals(status?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["signals", status],
    queryFn: async () => {
      let queryBuilder = supabase
        .from("signals")
        .select(`
          *,
          trading_pairs (
            symbol,
            name,
            category
          )
        `)
        .order("created_at", { ascending: false });

      if (status) {
        queryBuilder = queryBuilder.eq("status", status);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw error;
      }

      return (data as SignalWithPair[]).map(transformSignal);
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("signals-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "signals",
        },
        () => {
          // Invalidate and refetch signals on any change
          queryClient.invalidateQueries({ queryKey: ["signals"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateSignal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (signal: {
      pair_id: string;
      signal_type: string;
      timeframe: string;
      entry_price: number;
      stop_loss: number;
      take_profit: number;
      confidence: number;
      reasons?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("signals")
        .insert({
          ...signal,
          created_by: user?.id,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast({
        title: "Sinal criado",
        description: "O sinal foi adicionado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useGenerateSignal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (pairId?: string) => {
      const { data, error } = await supabase.functions.invoke("generate-signal", {
        body: { pair_id: pairId },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast({
        title: "Sinal gerado",
        description: "Um novo sinal foi gerado pela IA.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar sinal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
