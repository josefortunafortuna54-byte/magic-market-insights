import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Message } from '@/core/types';

const DEBOUNCE_MS = 350;

export function useMessageSearch(query: string) {
  const { user } = useAuth();
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const q = query.trim();
      if (!q || !user) {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      (async () => {
        try {
          const { data } = await supabase.rpc('search_messages', { q });
          if (!cancelled) setResults((data as Message[] | null) || []);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user]);

  return { results, loading };
}
