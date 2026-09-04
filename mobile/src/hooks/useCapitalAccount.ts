import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';
import type { CapitalAccount, CapitalReport } from '@/core/types';

async function fetchAccount(userId: string): Promise<CapitalAccount | null> {
  const { data, error } = await supabase
    .from('capital_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as CapitalAccount | null) ?? null;
}

async function fetchReports(userId: string): Promise<CapitalReport[]> {
  const { data, error } = await supabase
    .from('capital_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(52);
  if (error) throw error;
  return (data ?? []) as CapitalReport[];
}

/**
 * Saldo e relatórios da Gestão de Capital publicados pela equipa.
 * Servidor é a fonte da verdade; realtime atualiza sem reiniciar a app.
 */
export function useCapitalAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.id;

  const accountQuery = useQuery<CapitalAccount | null, Error>({
    queryKey: ['capital-account', user?.id],
    queryFn: () => fetchAccount(user!.id),
    enabled,
  });

  const reportsQuery = useQuery<CapitalReport[], Error>({
    queryKey: ['capital-reports', user?.id],
    queryFn: () => fetchReports(user!.id),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges('capital_accounts', [
      {
        table: 'capital_accounts',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['capital-account', user!.id] }),
      },
      {
        table: 'capital_reports',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['capital-reports', user!.id] }),
      },
    ]);
  }, [enabled, queryClient, user]);

  return {
    account: accountQuery.data ?? null,
    reports: reportsQuery.data ?? [],
    loading: accountQuery.isLoading || reportsQuery.isLoading,
  };
}
