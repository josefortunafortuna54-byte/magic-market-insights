import { supabase } from '@/lib/supabase';

let channelSeq = 0;

interface ChangesListener {
  table: string;
  filter?: string;
  onEvent: (payload: unknown) => void;
}

export function subscribeToChanges(name: string, listeners: ChangesListener[]): () => void {
  const channel = supabase.channel(`${name}-${++channelSeq}`);

  for (const l of listeners) {
    const opts: { event: '*'; schema: string; table: string; filter?: string } = {
      event: '*',
      schema: 'public',
      table: l.table,
    };
    if (l.filter) opts.filter = l.filter;
    channel.on('postgres_changes', opts, (payload) => l.onEvent(payload));
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
