import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';

export interface WithdrawalItem {
  id: string;
  user_id: string;
  method: string;
  amount: number;
  currency: string;
  details: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  notes: string | null;
  created_at: string;
}

async function fetchWithdrawals(userId: string): Promise<WithdrawalItem[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as WithdrawalItem[];
}

/** Levantamentos do utilizador com atualização em tempo real (RLS: wr_select_own). */
export function useWithdrawals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user?.id);

  const query = useQuery<WithdrawalItem[], Error>({
    queryKey: ['capital-withdrawals', user?.id],
    queryFn: () => fetchWithdrawals(user!.id),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges('withdrawal_requests', [
      {
        table: 'withdrawal_requests',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['capital-withdrawals', user!.id] }),
      },
    ]);
  }, [enabled, queryClient, user]);

  return { withdrawals: query.data ?? [], loading: query.isLoading, refetch: query.refetch };
}