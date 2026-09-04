import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppText, EmptyState, Spinner } from '@/components/ui';
import { TradingViewChart } from '@/components/TradingViewChart';
import { PremiumLock } from '@/components/PremiumLock';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_LIMITS } from '@/core/gating';
import { useTranslation } from 'react-i18next';
import { formatSymbol, formatTimeframe, formatType } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Signal } from '@/core/types';

export default function ChartFullScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  // Enquanto o plano não está confirmado tratamos como premium — um cliente
  // premium nunca deve ver o ecrã de bloqueio, nem sequer durante o arranque.
  const { planTier, loading: subLoading } = useSubscription();
  const allUnlocked = subLoading || planTier === 'pro' || planTier === 'premium';
  const limits = PLAN_LIMITS[allUnlocked ? 'premium' : planTier] ?? PLAN_LIMITS.free;

  const { data: signal, isLoading, error } = useQuery<Signal | null, Error>({
    queryKey: ['signal', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('signals').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as any;
      return {
        id: String(row.id),
        pair: formatSymbol(row.symbol),
        timeframe: formatTimeframe(row.timeframe),
        type: formatType(row.signal_type),
        confidence: Number(row.confidence) || 50,
        entry: Number(row.entry_price) || 0,
        stopLoss: Number(row.stop_loss) || 0,
        takeProfit: Number(row.target_price) || 0,
        reasons: Array.isArray(row.reasons) ? row.reasons : [],
        createdAt: row.created_at ?? new Date().toISOString(),
        status: 'active',
      } as Signal;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Spinner label={t('sinal.loading')} />
      </View>
    );
  }

  if (error || !signal) {
    return (
      <View style={styles.container}>
        <EmptyState title={t('sinal.notFound')} subtitle={error?.message} />
      </View>
    );
  }

  const pairNorm = signal.pair.replace(/[^A-Za-z]/g, '');
  const pairAllowed = limits.pairs.some((p) => p.replace(/[^A-Za-z]/g, '') === pairNorm);
  const tfAllowed = signal.timeframe === 'Todos' || limits.timeframes.includes(signal.timeframe as any);
  // Pro/premium: tudo desbloqueado (inclui cripto fora das listas, ex. ETHUSDT).
  if (!allUnlocked && (!pairAllowed || !tfAllowed)) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.lockWrap}>
          <PremiumLock
            label={`${signal.pair} ${signal.timeframe}`}
            description={t('analises.premiumDesc')}
          />
          <Pressable style={styles.closeBtnAbsolute} hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <TradingViewChart
        pair={signal.pair}
        timeframe={signal.timeframe}
        height={height}
        entry={signal.entry}
        stopLoss={signal.stopLoss}
        takeProfit={signal.takeProfit}
        style={{ marginBottom: 0, borderRadius: 0 }}
      />
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <AppText variant="h2" style={styles.title} numberOfLines={1}>{signal.pair} {signal.timeframe}</AppText>
        <View style={styles.closeBtn} />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  lockWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: c.bg,
  },
  closeBtnAbsolute: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', flex: 1, color: c.text },
});
