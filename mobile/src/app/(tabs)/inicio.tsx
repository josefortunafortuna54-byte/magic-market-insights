import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { EmptyState, Screen, Spinner } from '@/components/ui';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import { BoomHourCard, boomHourStatus } from '@/components/BoomHourCard';
import { ChannelSignals } from '@/components/ChannelSignals';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NewsCard } from '@/components/NewsCard';
import { NextBoomCard } from '@/components/NextBoomCard';
import { PerformanceCard } from '@/components/PerformanceCard';
import { PremiumStatusBanner } from '@/components/PremiumStatusBanner';
import { PriceTicker } from '@/components/PriceTicker';
import { SectionHeader } from '@/components/SectionHeader';
import { TopSignalCard, bestSignalOf } from '@/components/TopSignalCard';
import { useBoomHours } from '@/hooks/useBoomHours';
import { useChannels } from '@/hooks/useChannels';
import { useHistory } from '@/hooks/useHistory';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useSignals } from '@/hooks/useSignals';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { boomEpochMs, getNextBoomHour } from '@/core/booms';
import { Spacing } from '@/core/theme';
import { useTourTarget } from '@/components/tour/registry';
import { useTranslation } from 'react-i18next';
import { Animated, FadeInUp } from '@/lib/animations';

const TICKER_PAIRS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'];

export default function InicioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { planTier } = useSubscription();
  const {
    prices,
    loading: pricesLoading,
    activePairs,
  } = useLivePrices(TICKER_PAIRS);
  const { stats, loading: historyLoading, refetch: refetchHistory } = useHistory();
  const { signals, refetch: refetchSignals } = useSignals();
  const { hours, loading: hoursLoading, refetch: refetchHours } = useBoomHours();
  const { channels } = useChannels();
  const performanceRef = useTourTarget('tour:inicio-performance');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchHistory(),
        refetchSignals(),
        refetchHours(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchHistory, refetchSignals, refetchHours]);

  const nextHour = getNextBoomHour(hours, now);
  let nextEpochMs: number | undefined;
  if (nextHour) {
    const epoch = boomEpochMs(now, nextHour.time_wat);
    if (epoch > now.getTime()) nextEpochMs = epoch;
  }

  // Todos os BOOMs activos de hoje: em curso primeiro, depois os futuros.
  const { liveBooms, upcomingBooms } = useMemo(() => {
    const withStatus = hours
      .map((h) => ({ hour: h, epoch: boomEpochMs(now, h.time_wat), status: boomHourStatus(h, now) }))
      .sort((a, b) => a.epoch - b.epoch);
    return {
      liveBooms: withStatus.filter((x) => x.status === 'live'),
      upcomingBooms: withStatus.filter((x) => x.status === 'upcoming'),
    };
  }, [hours, now]);

  const activeCount = signals.filter((s) => s.status === 'active' || s.status === 'pending').length;
  const topSignal = bestSignalOf(signals);

  return (
    <Screen scroll={false} safeTop style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>
        <DashboardHeader planTier={planTier} />

        <View style={styles.ticker}>
          <PriceTicker
            pairs={activePairs}
            prices={prices}
            loading={pricesLoading}
          />
        </View>

        <AnnouncementCard />

        <PremiumStatusBanner />

        <View ref={performanceRef} collapsable={false}>
          <PerformanceCard
            stats={stats}
            activeCount={activeCount}
            loading={historyLoading}
            onPress={() => router.push('/(tabs)/historico')}
          />
        </View>

        <NewsCard />

        <TopSignalCard
          signal={topSignal}
          price={topSignal ? prices[topSignal.pair] : undefined}
          onPress={topSignal ? () => router.push(`/sinal/${topSignal.id}`) : undefined}
        />

        <ChannelSignals channels={channels} signals={signals} />

        <NextBoomCard nextEpochMs={nextEpochMs} />

        <SectionHeader
          title={t('inicio.nextHours')}
          subtitle={t('inicio.activeBoomsSubtitle')}
          action={{ label: t('inicio.viewAll'), onPress: () => router.push('/(tabs)/horarios') }}
        />

        {hoursLoading ? (
          <Spinner label={t('inicio.loadingHours')} />
        ) : liveBooms.length === 0 && upcomingBooms.length === 0 ? (
          <EmptyState title={t('inicio.emptyTitle')} subtitle={t('inicio.emptyBody')} />
        ) : (
          <>
            {liveBooms.length > 0 ? (
              <>
                <SectionHeader title={t('inicio.liveSection')} />
                {liveBooms.map(({ hour }, index) => (
                  <Animated.View key={`live-${hour.id}`} entering={FadeInUp.delay(index * 80).springify()}>
                    <Pressable onPress={() => router.push('/(tabs)/horarios')}>
                      <BoomHourCard hour={hour} now={now} />
                    </Pressable>
                  </Animated.View>
                ))}
              </>
            ) : null}
            <SectionHeader title={t('inicio.upcomingSection')} />
            {upcomingBooms.map(({ hour }, index) => (
              <Animated.View key={hour.id} entering={FadeInUp.delay(index * 60 + 200).springify()}>
                <Pressable onPress={() => router.push('/(tabs)/horarios')}>
                  <BoomHourCard hour={hour} now={now} />
                </Pressable>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  ticker: { marginBottom: Spacing.lg },
});
