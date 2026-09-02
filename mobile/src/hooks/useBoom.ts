import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BoomTime } from '@/core/types';

export function useBoom(id: string) {
  const [boom, setBoom] = useState<BoomTime | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('boom_times')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setBoom((data as BoomTime | null) ?? null);
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { boom, refresh };
}
