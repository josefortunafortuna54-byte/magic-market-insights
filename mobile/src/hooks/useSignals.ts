import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { Signal, SignalStatus, SignalType, SignalTier } from '@/core/types';
import { formatSymbol, formatTimeframe, formatType } from '@/core/format';
import { isForexSymbol, isWeekendUtc } from '@/core/community';
import { notifyNewSignal } from '@/lib/signalNotifications';
import { useSubscription } from '@/hooks/useSubscription';
import { ensureWeekendCryptoSignals, generateSignalsNow } from '@/lib/cryptoSignals';

const SIGNAL_QUALITY = {
  MIN_CONFIDENCE: 55,
  MIN_RISK_REWARD: 1.5,
  MAX_ACTIVE: 20,
} as const;

function determineStatus(status: string | null, confidence: number): SignalStatus {
  if (status === 'tp') return 'tp';
  if (status === 'sl') return 'sl';
  if (status === 'active') return 'active';
  if (status === 'pending') return 'pending';
  // Sinais da IA já vêm com status 'active' — manter
  return 'active';
}

function determineTier(status: string | null, confidence: number, isPremium: boolean): SignalTier {
  if (isPremium) return 'premium';
  // Todos os sinais da IA são free — não esconder por confiança
  return 'free';
}

function calculateRiskReward(entry: number, sl: number, tp: number): number | undefined {
  if (!entry || !sl || !tp) return undefined;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return undefined;
  return Number((reward / risk).toFixed(1));
}

function passesQualityFilter(confidence: number, rr: number | undefined): boolean {
  if (confidence < SIGNAL_QUALITY.MIN_CONFIDENCE) return false;
  if (rr !== undefined && rr < SIGNAL_QUALITY.MIN_RISK_REWARD) return false;
  return true;
}

async function fetchSignals(userTier: SignalTier = 'free'): Promise<Signal[]> {
  const isPremium = userTier === 'premium' || userTier === 'pro';

  const { data, error } = await supabase.rpc('get_user_signals');

  if (error) throw error;

  const mapped: Signal[] = (data || []).map((row: any) => {
    const entry = Number(row.entry_price) || 0;
    const sl = Number(row.stop_loss) || 0;
    const tp = Number(row.target_price) || 0;
    const confidence = Number(row.confidence) || 50;
    const tier = determineTier(row.status, confidence, isPremium);
    const rr = calculateRiskReward(entry, sl, tp);

    return {
      id: String(row.id),
      pair: formatSymbol(row.symbol),
      timeframe: formatTimeframe(row.timeframe),
      type: formatType(row.signal_type),
      confidence,
      entry,
      stopLoss: sl,
      takeProfit: tp,
      reasons: Array.isArray(row.reasons) ? row.reasons : [],
      createdAt: row.created_at ?? new Date().toISOString(),
      status: determineStatus(row.status, confidence),
      tier,
      riskReward: rr,
      expiresAt: row.expires_at ?? undefined,
      analysis: row.analysis ?? undefined,
      probabilityScore: row.probability_score ?? undefined,
      smcSetup: row.smc_setup ?? undefined,
    };
  });

  let qualityFiltered = mapped.filter((s) => passesQualityFilter(s.confidence, s.riskReward));

  // Weekend: only crypto
  const weekend = isWeekendUtc();
  if (weekend) {
    qualityFiltered = qualityFiltered.filter((s) => !isForexSymbol(s.pair));
  }

  return qualityFiltered.slice(0, SIGNAL_QUALITY.MAX_ACTIVE);
}

export function useSignals() {
  const queryClient = useQueryClient();
  const notifiedRef = useRef<Set<string>>(new Set());
  const { planTier } = useSubscription();
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ count: number; error?: string } | null>(null);

  const signalTier: SignalTier = planTier === 'pro' || planTier === 'premium' || planTier === 'basic' ? planTier : 'free';

  const { data: signals = [], isLoading: loading, error: queryError, refetch } = useQuery<Signal[], Error>({
    queryKey: ['signals', signalTier],
    queryFn: () => fetchSignals(signalTier),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (loading || !signals.length) return;
    for (const signal of signals) {
      if (!notifiedRef.current.has(signal.id)) {
        notifiedRef.current.add(signal.id);
        notifyNewSignal(signal, planTier).catch(() => {});
      }
    }
    if (notifiedRef.current.size > 500) {
      const arr = Array.from(notifiedRef.current);
      notifiedRef.current = new Set(arr.slice(-250));
    }
  }, [signals, loading, planTier]);

  useEffect(() => {
    return subscribeToChanges('signals', [
      { table: 'signals', onEvent: () => queryClient.invalidateQueries({ queryKey: ['signals'] }) },
    ]);
  }, [queryClient]);

  useEffect(() => {
    ensureWeekendCryptoSignals().then(() => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
    });
  }, [queryClient]);

  const doGenerate = useCallback(async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await generateSignalsNow();
      setGenResult({ count: result.count, error: result.error });
      await queryClient.invalidateQueries({ queryKey: ['signals'] });
    } catch (e: unknown) {
      setGenResult({ count: 0, error: e instanceof Error ? e.message : 'Erro' });
    } finally {
      setGenerating(false);
    }
  }, [queryClient]);

  return { signals, loading, error: queryError?.message || null, refetch, generating, genResult, generateNow: doGenerate };
}

export type { SignalType };
