import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useCreatePair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pair: TablesInsert<"trading_pairs">) => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .insert(pair)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-pairs"] });
      queryClient.invalidateQueries({ queryKey: ["all-trading-pairs"] });
    },
  });
}

export function useUpdatePair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"trading_pairs"> & { id: string }) => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-pairs"] });
      queryClient.invalidateQueries({ queryKey: ["all-trading-pairs"] });
    },
  });
}

export function useDeletePair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trading_pairs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-pairs"] });
      queryClient.invalidateQueries({ queryKey: ["all-trading-pairs"] });
    },
  });
}
