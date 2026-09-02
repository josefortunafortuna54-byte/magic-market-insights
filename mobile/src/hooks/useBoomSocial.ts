import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { BoomComment, BoomVote } from '@/core/types';

export function useBoomSocial(boomId: string) {
  const [comments, setComments] = useState<BoomComment[]>([]);
  const [votes, setVotes] = useState<BoomVote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [{ data: c }, { data: v }] = await Promise.all([
        supabase
          .from('boom_comments')
          .select('*')
          .eq('boom_id', boomId)
          .order('created_at', { ascending: true }),
        supabase.from('boom_votes').select('*').eq('boom_id', boomId),
      ]);
      setComments((c || []) as BoomComment[]);
      setVotes((v || []) as BoomVote[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [boomId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    const cleanup = subscribeToChanges(`boom-social-${boomId}`, [
      { table: 'boom_comments', filter: `boom_id=eq.${boomId}`, onEvent: () => refresh() },
      { table: 'boom_votes', filter: `boom_id=eq.${boomId}`, onEvent: () => refresh() },
    ]);

    const poll = setInterval(refresh, 15_000);

    return () => {
      clearTimeout(timer);
      cleanup();
      clearInterval(poll);
    };
  }, [boomId, refresh]);

  return { comments, votes, loading, refresh };
}
