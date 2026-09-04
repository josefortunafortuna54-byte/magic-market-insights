import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { Announcement } from '@/core/types';

async function fetchAnnouncements(): Promise<Announcement[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data || []) as Announcement[];
}

export function useAnnouncements() {
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading: loading } = useQuery<Announcement[], Error>({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: 60_000,
  });

  useEffect(() => {
    return subscribeToChanges('announcements', [
      { table: 'announcements', onEvent: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }) },
    ]);
  }, [queryClient]);

  return { announcements, loading };
}
