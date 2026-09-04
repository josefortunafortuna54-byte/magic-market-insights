import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TradeEntry, TradeStats } from '@/lib/types';

const STORAGE_KEY = 'trade_journal';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function toRow(trade: TradeEntry, userId: string) {
  return {
    id: trade.id,
    user_id: userId,
    pair: trade.pair,
    direction: trade.direction,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    lot_size: trade.lotSize,
    result: trade.result,
    profit_usd: trade.profitUsd,
    pips: trade.pips,
    notes: trade.notes,
    boom_hour_id: trade.boomHourId,
    created_at: trade.createdAt,
    closed_at: trade.closedAt,
    synced_at: new Date().toISOString(),
  };
}

function fromRow(row: Record<string, unknown>): TradeEntry {
  return {
    id: row.id as string,
    pair: row.pair as string,
    direction: row.direction as 'BUY' | 'SELL',
    entryPrice: Number(row.entry_price),
    exitPrice: row.exit_price != null ? Number(row.exit_price) : null,
    lotSize: Number(row.lot_size),
    result: row.result as 'WIN' | 'LOSS' | 'BREAKEVEN',
    profitUsd: Number(row.profit_usd),
    pips: Number(row.pips),
    notes: (row.notes as string) || '',
    boomHourId: (row.boom_hour_id as string) || null,
    createdAt: row.created_at as string,
    closedAt: (row.closed_at as string) || null,
  };
}

function readCache(): TradeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as TradeEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCache(trades: TradeEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch {
    return;
  }
}

export function useTradeJournal() {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const localTrades = readCache();
      if (!cancelled && localTrades.length > 0) {
        setTrades(localTrades);
      }

      setLoading(false);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session || cancelled) return;

        const { data, error } = await supabase
          .from('trade_journal')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || cancelled) return;

        const serverTrades = (data ?? []).map(fromRow);

        if (serverTrades.length > 0) {
          const serverIds = new Set(serverTrades.map((t) => t.id));
          const localOnly = localTrades.filter((t) => !serverIds.has(t.id));
          const merged = [...serverTrades, ...localOnly];
          setTrades(merged);
          writeCache(merged);
        }
      } catch {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (updater: (prev: TradeEntry[]) => TradeEntry[]) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    setTrades((prev) => {
      const next = updater(prev);

      writeCache(next);

      if (userId) {
        const prevIds = new Set(prev.map((t) => t.id));
        const nextIds = new Set(next.map((t) => t.id));

        const added = next.filter((t) => !prevIds.has(t.id));
        const updated = next.filter((t) => {
          if (prevIds.has(t.id)) {
            const old = prev.find((p) => p.id === t.id);
            return old && JSON.stringify(old) !== JSON.stringify(t);
          }
          return false;
        });
        const removed = prev.filter((t) => !nextIds.has(t.id));

        (async () => {
          try {
            if (added.length > 0) {
              await supabase
                .from('trade_journal')
                .upsert(added.map((t) => toRow(t, userId)), { onConflict: 'id' });
            }
            if (updated.length > 0) {
              for (const t of updated) {
                await supabase
                  .from('trade_journal')
                  .update(toRow(t, userId))
                  .eq('id', t.id)
                  .eq('user_id', userId);
              }
            }
            if (removed.length > 0) {
              await supabase
                .from('trade_journal')
                .delete()
                .in('id', removed.map((t) => t.id))
                .eq('user_id', userId);
            }
          } catch (e) {
            console.warn('[tradeJournal] Supabase sync failed:', e instanceof Error ? e.message : e);
          }
        })();
      }

      return next;
    });
  }, []);

  const addTrade = useCallback(
    async (entry: Omit<TradeEntry, 'id' | 'createdAt'> & { createdAt?: string }) => {
      const now = new Date();
      const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.000`;
      const trade: TradeEntry = {
        ...entry,
        id: genId(),
        createdAt: entry.createdAt ?? defaultDate,
      };
      await persist((prev) => [trade, ...prev]);
      return trade;
    },
    [persist],
  );

  const removeTrade = useCallback(
    async (id: string) => {
      await persist((prev) => prev.filter((t) => t.id !== id));
    },
    [persist],
  );

  const updateTrade = useCallback(
    async (id: string, patch: Partial<TradeEntry>) => {
      await persist((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [persist],
  );

  const stats = useMemo<TradeStats>(() => {
    const closed = trades.filter((t) => t.result !== 'BREAKEVEN');
    const wins = trades.filter((t) => t.result === 'WIN');
    const losses = trades.filter((t) => t.result === 'LOSS');
    const breakevens = trades.filter((t) => t.result === 'BREAKEVEN');
    const totalPnl = trades.reduce((s, t) => s + t.profitUsd, 0);
    const totalPips = trades.reduce((s, t) => s + t.pips, 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.profitUsd, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.profitUsd, 0) / losses.length) : 0;
    const grossProfit = wins.reduce((s, t) => s + t.profitUsd, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitUsd, 0));
    return {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      breakevens: breakevens.length,
      winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      totalPnl,
      avgWin,
      avgLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      bestTrade: trades.length > 0 ? Math.max(...trades.map((t) => t.profitUsd)) : 0,
      worstTrade: trades.length > 0 ? Math.min(...trades.map((t) => t.profitUsd)) : 0,
      totalPips,
    };
  }, [trades]);

  const todayPnl = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return trades
      .filter((t) => t.createdAt.slice(0, 10) === today)
      .reduce((s, t) => s + t.profitUsd, 0);
  }, [trades]);

  const weekPnl = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400_000);
    const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
    return trades
      .filter((t) => t.createdAt.slice(0, 10) >= weekAgoStr)
      .reduce((s, t) => s + t.profitUsd, 0);
  }, [trades]);

  return { trades, loading, stats, todayPnl, weekPnl, addTrade, removeTrade, updateTrade };
}