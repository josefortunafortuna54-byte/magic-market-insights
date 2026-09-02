import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PairAnalytics {
  symbol: string;
  total: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_pips: number;
  total_pips: number;
}

export interface TimeframeAnalytics {
  timeframe: string;
  total: number;
  wins: number;
  win_rate: number;
  avg_pips: number;
}

export interface SmcSetupAnalytics {
  smc_setup: string;
  total: number;
  wins: number;
  win_rate: number;
  avg_pips: number;
}

export interface EquityCurvePoint {
  date: string;
  daily_pips: number;
  cumulative_pips: number;
}

export function usePairAnalytics() {
  return useQuery<PairAnalytics[]>({
    queryKey: ['pair-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pair_analytics');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useTimeframeAnalytics() {
  return useQuery<TimeframeAnalytics[]>({
    queryKey: ['timeframe-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_timeframe_analytics');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useSmcSetupAnalytics() {
  return useQuery<SmcSetupAnalytics[]>({
    queryKey: ['smc-setup-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_smc_setup_analytics');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useEquityCurve(days = 30) {
  return useQuery<EquityCurvePoint[]>({
    queryKey: ['equity-curve', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_equity_curve', { days });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
