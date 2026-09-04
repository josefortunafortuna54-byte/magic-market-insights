import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { BoomHour } from '@/core/types';

async function fetchBoomHours(): Promise<BoomHour[]> {
  const { data, error } = await supabase
    .from('boom_hours')
    .select('*')
    .eq('is_active', true)
    .order('time_wat', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: String(row.id),
    title: row.title ?? '',
    time_gmt: row.time_gmt ?? '',
    time_wat: row.time_wat ?? '',
    pairs: Array.isArray(row.pairs) ? row.pairs : [],
    days: row.days ?? '',
    description: row.description ?? '',
    volatility: Number(row.volatility) || 1,
    badge: row.badge ?? '',
    is_active: row.is_active !== false,
    created_at: row.created_at ?? new Date().toISOString(),
  }));
}

export function useBoomHours() {
  const queryClient = useQueryClient();

  const { data: hours = [], isLoading: loading, error, refetch } = useQuery<BoomHour[], Error>({
    queryKey: ['boom-hours'],
    queryFn: fetchBoomHours,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    return subscribeToChanges('boom-hours', [
      { table: 'boom_hours', onEvent: () => queryClient.invalidateQueries({ queryKey: ['boom-hours'] }) },
    ]);
  }, [queryClient]);

  return { hours, loading, error: error?.message || null, refetch };
}
