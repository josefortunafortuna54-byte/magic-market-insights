import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { BoomComment, BoomTime, BoomVote } from '@/core/types';

async function fetchBooms(): Promise<BoomTime[]> {
  const { data, error } = await supabase
    .from('boom_times')
    .select('*')
    .eq('is_active', true)
    .order('boom_time', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: String(row.id),
    pair: row.pair ?? '—',
    boom_time: row.boom_time ?? new Date().toISOString(),
    confidence: Number(row.confidence) || 0,
    result: (row.result as BoomTime['result']) ?? null,
    image_url: row.image_url ?? '',
    audio_url: row.audio_url ?? '',
    is_active: row.is_active !== false,
    created_at: row.created_at ?? new Date().toISOString(),
  }));
}

export function useBooms() {
  const [booms, setBooms] = useState<BoomTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooms = useCallback(async () => {
    try {
      const data = await fetchBooms();
      setBooms(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar booms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBooms();
    }, 0);
    const cleanup = subscribeToChanges('booms', [
      { table: 'boom_times', onEvent: () => loadBooms() },
    ]);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [loadBooms]);

  return { booms, loading, error, refetch: loadBooms };
}

export async function fetchBoomVotes(boomId: string): Promise<BoomVote[]> {
  const { data } = await supabase.from('boom_votes').select('*').eq('boom_id', boomId);
  return (data || []) as BoomVote[];
}

export async function fetchBoomComments(boomId: string): Promise<BoomComment[]> {
  const { data } = await supabase
    .from('boom_comments')
    .select('*')
    .eq('boom_id', boomId)
    .order('created_at', { ascending: true });
  return (data || []) as BoomComment[];
}

export async function castVote(
  boomId: string,
  userId: string,
  type: 'BUY' | 'SELL',
  currentVote: 'BUY' | 'SELL' | null,
): Promise<'BUY' | 'SELL' | null> {
  if (currentVote === type) {
    await supabase.from('boom_votes').delete().eq('boom_id', boomId).eq('user_id', userId);
    return null;
  }
  await supabase
    .from('boom_votes')
    .upsert({ boom_id: boomId, user_id: userId, vote: type }, { onConflict: 'boom_id,user_id' });
  return type;
}
