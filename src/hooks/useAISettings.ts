import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AISettings {
  // RSI Thresholds
  rsi_oversold: number;
  rsi_overbought: number;
  rsi_period: number;
  
  // EMA Settings
  ema_period: number;
  
  // Confidence Thresholds
  min_confidence_buy: number;
  min_confidence_sell: number;
  
  // Risk Management
  stop_loss_percent: number;
  take_profit_percent: number;
  
  // Timeframes
  enabled_timeframes: string[];
  default_timeframe: string;
  
  // Per-Pair Overrides (symbol -> settings)
  pair_overrides: Record<string, Partial<AISettings>>;
}

const DEFAULT_SETTINGS: AISettings = {
  rsi_oversold: 30,
  rsi_overbought: 70,
  rsi_period: 14,
  ema_period: 20,
  min_confidence_buy: 70,
  min_confidence_sell: 70,
  stop_loss_percent: 0.5,
  take_profit_percent: 1.0,
  enabled_timeframes: ["M15", "H1", "H4", "D1"],
  default_timeframe: "H1",
  pair_overrides: {},
};

export function useAISettings() {
  return useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "ai_settings")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data?.value) {
        return { ...DEFAULT_SETTINGS, ...(data.value as unknown as AISettings) };
      }

      return DEFAULT_SETTINGS;
    },
  });
}

export function useUpdateAISettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<AISettings>) => {
      // First try to get existing settings
      const { data: existing } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "ai_settings")
        .single();

      const currentSettings = existing?.value 
        ? { ...DEFAULT_SETTINGS, ...(existing.value as unknown as AISettings) }
        : DEFAULT_SETTINGS;

      const newSettings = { ...currentSettings, ...settings };

      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key: "ai_settings",
          value: newSettings as unknown as Json,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "key",
        });

      if (error) throw error;
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
  });
}

export function useUpdatePairOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ symbol, override }: { symbol: string; override: Partial<AISettings> | null }) => {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "ai_settings")
        .single();

      const currentSettings = existing?.value 
        ? { ...DEFAULT_SETTINGS, ...(existing.value as unknown as AISettings) }
        : DEFAULT_SETTINGS;

      const newOverrides = { ...currentSettings.pair_overrides };
      
      if (override === null) {
        delete newOverrides[symbol];
      } else {
        newOverrides[symbol] = override;
      }

      const newSettings = { ...currentSettings, pair_overrides: newOverrides };

      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key: "ai_settings",
          value: newSettings as unknown as Json,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "key",
        });

      if (error) throw error;
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
  });
}
