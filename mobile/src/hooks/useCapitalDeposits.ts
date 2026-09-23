import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';

export interface CapitalDeposit {
  id: string;
  user_id: string;
  plan: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

async function fetchCapitalDeposits(userId: string): Promise<CapitalDeposit[]> {
  const { data, error } = await supabase
    .from('payment_receipts')
    .select('*')
    .eq('user_id', userId)
    .eq('plan', 'capital')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as CapitalDeposit[];
}

/** Histórico de depósitos de gestão de capital (payment_receipts com plan='capital'). */
export function useCapitalDeposits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user?.id);

  const query = useQuery<CapitalDeposit[], Error>({
    queryKey: ['capital-deposits', user?.id],
    queryFn: () => fetchCapitalDeposits(user!.id),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges('payment_receipts', [
      {
        table: 'payment_receipts',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['capital-deposits', user!.id] }),
      },
    ]);
  }, [enabled, queryClient, user]);

  return { deposits: query.data ?? [], loading: query.isLoading, refetch: query.refetch };
}