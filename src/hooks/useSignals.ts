import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useEffect } from "react";

export type Signal = Tables<"signals"> & {
  trading_pairs?: Tables<"trading_pairs">;
};

export function useSignals(status?: string) {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("signals-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signals" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["signals"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["signals", status],
    queryFn: async () => {
      let query = supabase
        .from("signals")
        .select("*, trading_pairs(*)")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Signal[];
    },
  });
}

export function useAllSignals() {
  return useQuery({
    queryKey: ["all-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*, trading_pairs(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Signal[];
    },
  });
}

export function useCreateSignal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signal: TablesInsert<"signals">) => {
      const { data, error } = await supabase
        .from("signals")
        .insert(signal)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["all-signals"] });
    },
  });
}

export function useUpdateSignal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"signals"> & { id: string }) => {
      const { data, error } = await supabase
        .from("signals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["all-signals"] });
    },
  });
}

export function useDeleteSignal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("signals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["all-signals"] });
    },
  });
}
