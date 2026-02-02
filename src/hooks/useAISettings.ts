import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface AISettingsData {
  rsi_oversold: number;
  rsi_overbought: number;
  ema_short: number;
  ema_long: number;
  min_confidence: number;
  default_timeframe: string;
  sl_pips: number;
  tp_multiplier: number;
}

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

function isAISettingsData(value: Json): value is AISettingsData & Json {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "rsi_oversold" in value &&
    "rsi_overbought" in value
  );
}

export function useAISettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "ai_settings")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No settings found, return defaults
          return DEFAULT_SETTINGS;
        }
        throw error;
      }

      if (data?.value && isAISettingsData(data.value)) {
        return data.value as AISettingsData;
      }

      return DEFAULT_SETTINGS;
    },
  });

  const mutation = useMutation({
    mutationFn: async (settings: AISettingsData) => {
      const settingsAsJson: Json = settings as unknown as Json;
      
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "ai_settings")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: settingsAsJson })
          .eq("key", "ai_settings");

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert([{ key: "ai_settings", value: settingsAsJson }]);

        if (error) throw error;
      }

      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações da IA foram atualizadas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings: query.data || DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    updateSettings: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
