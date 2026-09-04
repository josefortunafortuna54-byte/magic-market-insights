import { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Badge, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { OptionMenu } from '@/components/OptionMenu';
import { SignalCard } from '@/components/SignalCard';
import { TradingViewChart } from '@/components/TradingViewChart';
import { PriceTicker } from '@/components/PriceTicker';
import { MetricGrid } from '@/components/MetricGrid';
import { AnalyticsBreakdown } from '@/components/AnalyticsBreakdown';
import { PlanUpsellModal } from '@/components/PlanUpsellModal';
import { useSignals } from '@/hooks/useSignals';
import { useSubscription } from '@/hooks/useSubscription';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useTheme } from '@/hooks/useTheme';
import {
  TIMEFRAMES,
  SIGNAL_TYPES,
  ALL_PAIRS,
  canAccessPair,
  canAccessTimeframe,
  PLAN_LIMITS,
  type PlanTier,
} from '@/core/gating';
import { calcOpenPips, pipsBetween } from '@/core/pips';
import { formatNumber } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { isWeekendUtc } from '@/core/community';
import { useTourTarget } from '@/components/tour/registry';
import { useTranslation } from 'react-i18next';

const SMC_SETUPS = ['Todos', 'BOS', 'CHoCH', 'OB', 'FVG', 'COMBO'] as const;

function decimalsFor(pair: string): number {
  if (pair.includes('JPY')) return 3;
  if (pair.includes('XAU') || pair.includes('BTC')) return 2;
  return 5;
}

export default function AnalisesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const { signals, loading, error, refetch, generating, genResult, generateNow } = useSignals();
  const { planTier, loading: subLoading } = useSubscription();

  const [pair, setPair] = useState('Todos');
  const [timeframe, setTimeframe] = useState('Todos');
  const [type, setType] = useState('Todos');
  const [smcFilter, setSmcFilter] = useState('Todos');
  const [viewMode, setViewMode] = useState<'signals' | 'analytics'>('signals');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [upsell, setUpsell] = useState<string | null>(null);
  const titleRef = useTourTarget('tour:analises-title');
  const weekend = isWeekendUtc();

  const limits = PLAN_LIMITS[planTier as PlanTier] ?? PLAN_LIMITS.free;
  const visiblePairs = limits.pairs;
  // Enquanto o plano não está confirmado NADA é bloqueado — um cliente
  // premium nunca deve ver restrições, nem sequer durante o arranque.
  const gatingOn = !subLoading;
  const tfLocked =
    gatingOn && timeframe !== 'Todos' && !canAccessTimeframe(timeframe, planTier as PlanTier);

  // Filtro de pares: Todos + pares suportados + quaisquer pares presentes nos sinais
  // (inclui cripto como ETH/USDT gerada ao fim de semana).
  const pairOptions = useMemo(() => {
    const set = new Set<string>(ALL_PAIRS);
    signals.forEach((s) => {
      if (s.pair) set.add(s.pair);
    });
    return ['Todos', ...Array.from(set)];
  }, [signals]);

  const {
    prices,
    loading: pricesLoading,
    activePairs,
  } = useLivePrices(visiblePairs);

  const filtered = useMemo(
    () =>
      signals.filter((s) => {
        if (pair !== 'Todos' && s.pair !== pair) return false;
        if (timeframe !== 'Todos' && s.timeframe !== timeframe) return false;
        if (type !== 'Todos' && s.type !== type) return false;
        if (smcFilter !== 'Todos' && s.smcSetup !== smcFilter) return false;
        return true;
      }),
    [signals, pair, timeframe, type, smcFilter],
  );

  const hero = selectedId ? filtered.find((s) => s.id === selectedId) ?? filtered[0] : filtered[0];
  const heroPairLocked =
    gatingOn && !!hero && !canAccessPair(hero.pair, planTier as PlanTier);
  const chartLocked = heroPairLocked || tfLocked;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const selectSignal = (id: string) => {
    setSelectedId(id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const heroLive = hero ? Number(prices[hero.pair]?.price) : null;
  const heroPips =
    hero && heroLive !== null && isFinite(heroLive) && heroLive > 0
      ? calcOpenPips(hero.entry, heroLive, hero.type, hero.pair)
      : null;
  const heroTpPips = hero ? pipsBetween(hero.entry, hero.takeProfit, hero.pair) : 0;
  const heroSlPips = hero ? pipsBetween(hero.entry, hero.stopLoss, hero.pair) : 0;
  const heroRr = hero && heroSlPips > 0 ? (heroTpPips / heroSlPips).toFixed(1) : '—';
  const heroTypeColor = hero?.type === 'BUY' ? colors.success : hero?.type === 'SELL' ? colors.destructive : colors.warning;

  return (
    <Screen scroll={false} style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View ref={titleRef} collapsable={false}>
          <SectionTitle
            right={
              <View style={styles.headerActions}>
                <Pressable onPress={() => refetch()} hitSlop={8}>
                  <Ionicons name="refresh" size={18} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => router.push('/planos')} hitSlop={8}>
                  <Ionicons name="star" size={20} color={colors.accent} />
                </Pressable>
              </View>
            }>
            {t('analises.title')}
          </SectionTitle>
        </View>

        {weekend ? (
          <View style={styles.weekendCard}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <View style={styles.weekendText}>
              <AppText variant="label" style={{ color: colors.primary }}>{t('analises.weekendMarketClosed')}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{t('analises.weekendMarketClosedBody')}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{t('analises.weekendCryptoAiBody')}</AppText>
            </View>
          </View>
        ) : null}

        <View style={styles.tickerWrap}>
          <PriceTicker
            pairs={activePairs}
            prices={prices}
            loading={pricesLoading}
            onPressPair={(p) => setPair(p)}
            selected={pair !== 'Todos' ? pair : undefined}
          />
        </View>

        <View style={styles.filterPanel}>
          <OptionMenu
            label={t('analises.filterPairs')}
            value={pair}
            options={pairOptions.map((p) => ({
              label: p === 'Todos' ? t('analises.filterAll') : p,
              value: p,
              locked: gatingOn && p !== 'Todos' && !canAccessPair(p, planTier as PlanTier),
            }))}
            onChange={setPair}
          />
          <OptionMenu
            label={t('analises.filterTimeframe')}
            value={timeframe}
            options={TIMEFRAMES.map((tf) => ({
              label: tf === 'Todos' ? t('analises.filterAll') : tf,
              value: tf,
              locked: gatingOn && tf !== 'Todos' && !canAccessTimeframe(tf, planTier as PlanTier),
            }))}
            onChange={setTimeframe}
          />
          <OptionMenu
            label={t('analises.filterType')}
            value={type}
            options={SIGNAL_TYPES.map((st) => ({
              label: st === 'Todos' ? t('analises.filterAll') : st,
              value: st,
            }))}
            onChange={setType}
          />
        </View>

        <AppText variant="small" style={{ color: colors.textMuted, marginBottom: Spacing.xs }}>{t('analises.filterSmc')}</AppText>
        <View style={styles.smcChips}>
          {SMC_SETUPS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSmcFilter(s)}
              style={[styles.smcChip, smcFilter === s && styles.smcChipActive]}>
              <AppText variant="small" style={{ color: smcFilter === s ? '#0B0B0F' : colors.textMuted, fontWeight: '600' }}>
                {s === 'Todos' ? t('analises.filterAll') : s}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.viewToggle}>
          {(['signals', 'analytics'] as const).map((mode) => {
            const active = viewMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setViewMode(mode)}
                style={[styles.viewToggleBtn, active && styles.viewToggleBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <Ionicons name={mode === 'signals' ? 'bar-chart' : 'stats-chart'} size={14} color={active ? '#0B0B0F' : colors.textMuted} />
                <AppText variant="small" style={{ color: active ? '#0B0B0F' : colors.textMuted, fontWeight: '700' }}>
                  {mode === 'signals' ? t('analises.title') : t('analises.analytics') || 'Analytics'}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {viewMode === 'analytics' ? (
          <AnalyticsBreakdown />
        ) : (
          <>
            {hero ? (
              <Pressable onPress={() => router.push(`/sinal/${hero.id}`)} style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroHeaderLeft}>
                <AppText variant="h1">{hero.pair}</AppText>
                <Badge color={heroTypeColor} bg={`${heroTypeColor}1F`}>{hero.type}</Badge>
                <Badge color={colors.textMuted} bg={`${colors.textMuted}1F`}>{hero.timeframe}</Badge>
              </View>
              <Badge color={colors.accent} bg={`${colors.accent}1F`}>{t('analises.highlight')}</Badge>
            </View>

            <View style={styles.chartWrap}>
              <TradingViewChart
                pair={hero.pair}
                timeframe={hero.timeframe}
                height={260}
                entry={hero.entry}
                stopLoss={hero.stopLoss}
                takeProfit={hero.takeProfit}
                style={{ marginHorizontal: -Spacing.md, borderRadius: 0 }}
                onPress={() => router.push(`/sinal/chart/${hero.id}`)}
              />
              {chartLocked ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setUpsell(heroPairLocked ? hero.pair : timeframe)}
                  style={styles.chartFrost}>
                  <LinearGradient
                    colors={['rgba(10,13,20,0.62)', 'rgba(10,13,20,0.88)']}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                  <View style={styles.frostInner}>
                    <View style={styles.frostIconWrap}>
                      <Ionicons name="lock-closed" size={16} color="#FFD75E" />
                    </View>
                    <AppText variant="label" style={styles.frostTitle}>
                      {t('analises.premiumTitle', { what: heroPairLocked ? hero.pair : timeframe })}
                    </AppText>
                    <AppText variant="small" style={styles.frostBody}>
                      {t('analises.premiumDesc')}
                    </AppText>
                    <View style={styles.frostCta}>
                      <AppText variant="small" style={styles.frostCtaText}>
                        {t('components.premiumLock.viewPlans')}
                      </AppText>
                      <Ionicons name="chevron-forward" size={12} color="#0B0B0F" />
                    </View>
                  </View>
                </Pressable>
              ) : null}
            </View>

            <MetricGrid
              items={[
                {
                  label: t('analises.currentPrice'),
                  value: heroLive !== null && isFinite(heroLive) && heroLive > 0 ? formatNumber(heroLive, decimalsFor(hero.pair)) : '—',
                  accent: colors.text,
                },
                {
                  label: t('analises.pipsOpen'),
                  value: heroPips === null ? '—' : `${heroPips > 0 ? '+' : ''}${heroPips.toFixed(1)}`,
                  accent: heroPips === null ? undefined : heroPips > 0 ? colors.success : colors.destructive,
                },
                { label: 'RR', value: `1:${heroRr}`, accent: colors.accent },
              ]}
            />

            <View style={styles.heroLevels}>
              <View style={styles.heroLevel}>
                <AppText variant="small" style={{ color: colors.accent }}>{t('analises.entry')}</AppText>
                <AppText variant="mono">{formatNumber(hero.entry, decimalsFor(hero.pair))}</AppText>
              </View>
              <View style={styles.heroLevel}>
                <AppText variant="small" style={{ color: colors.destructive }}>{t('analises.sl', { count: Math.round(heroSlPips) })}</AppText>
                <AppText variant="mono">{formatNumber(hero.stopLoss, decimalsFor(hero.pair))}</AppText>
              </View>
              <View style={styles.heroLevel}>
                <AppText variant="small" style={{ color: colors.success }}>{t('analises.tp', { count: Math.round(heroTpPips) })}</AppText>
                <AppText variant="mono">{formatNumber(hero.takeProfit, decimalsFor(hero.pair))}</AppText>
              </View>
            </View>

            <View style={styles.heroCtaRow}>
              <AppText variant="small" style={styles.heroCta}>
                {t('analises.viewFull')}
              </AppText>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.listHeader}>
          <AppText variant="label" style={{ color: colors.textMuted }}>
            {t('analises.signalsCount', { count: filtered.length })}
          </AppText>
        </View>

        {loading ? (
          <Spinner label={t('analises.loading')} />
        ) : error ? (
          <EmptyState title={t('analises.errorTitle')} subtitle={error} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState title={t('analises.emptyTitle')} subtitle={t('analises.emptyBody')} />
            {genResult && !generating ? (
              <View style={[styles.genStatus, genResult.error ? styles.genError : genResult.count > 0 ? styles.genSuccess : styles.genWarn]}>
                <Ionicons
                  name={genResult.error ? 'alert-circle' : genResult.count > 0 ? 'checkmark-circle' : 'information-circle'}
                  size={16}
                  color={genResult.error ? colors.destructive : genResult.count > 0 ? colors.success : colors.accent}
                />
                <AppText variant="small" style={{ color: genResult.error ? colors.destructive : genResult.count > 0 ? colors.success : colors.accent }}>
                  {genResult.error
                    ? t('analises.generateError')
                    : genResult.count > 0
                      ? t('analises.generateSuccess', { count: genResult.count })
                      : t('analises.generateNoSignals')}
                </AppText>
              </View>
            ) : null}
            <Pressable
              onPress={generateNow}
              disabled={generating}
              style={[styles.generateBtn, generating && styles.generateBtnDisabled]}>
              {generating ? (
                <Ionicons name="hourglass" size={16} color={colors.textMuted} />
              ) : (
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              )}
              <AppText variant="label" style={{ color: generating ? colors.textMuted : colors.primary }}>
                {generating ? t('analises.generating') : t('analises.generateBtn')}
              </AppText>
            </Pressable>
          </View>
        ) : (
          filtered.map((s) => (
            <SignalCard
              key={s.id}
              signal={s}
              price={prices[s.pair]}
              onPress={() => selectSignal(s.id)}
            />
          ))
        )}
          </>
        )}
      </ScrollView>
      <PlanUpsellModal visible={upsell !== null} what={upsell ?? ''} onClose={() => setUpsell(null)} />
    </Screen>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { padding: 0 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  weekendCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: c.primaryDim,
    borderColor: c.primary,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  weekendText: { flex: 1, gap: 2 },
  tickerWrap: { marginBottom: Spacing.md },
  filterPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  smcChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  smcChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  smcChipActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  viewToggleBtnActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  heroCard: {
    backgroundColor: c.surface,
    borderColor: c.accent,
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: -Spacing.md,
    padding: Spacing.md,
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  chartWrap: { marginHorizontal: -Spacing.md, borderRadius: 0, overflow: 'hidden' },
  chartFrost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  frostInner: { alignItems: 'center', gap: Spacing.xs },
  frostIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${c.accent}66`,
    backgroundColor: 'rgba(255,159,10,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  frostTitle: { color: c.text, textAlign: 'center' },
  frostBody: {
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  frostCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  frostCtaText: { color: '#0B0B0F', fontWeight: '800' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  heroLevels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  heroLevel: { gap: 2, flex: 1 },
  heroCtaRow: { alignItems: 'center', marginTop: Spacing.xs },
  heroCta: { color: c.accent, fontWeight: '700', textAlign: 'center' },
  listHeader: { marginVertical: Spacing.sm },
  emptyWrap: { alignItems: 'center', gap: Spacing.md },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: c.primaryDim,
    borderColor: c.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    width: '100%',
    justifyContent: 'center',
  },
  generateBtnDisabled: { opacity: 0.5 },
  genStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: 8,
    padding: Spacing.sm,
    width: '100%',
  },
  genSuccess: { backgroundColor: '#16a34a1F' },
  genError: { backgroundColor: '#dc26261F' },
  genWarn: { backgroundColor: '#f59e0b1F' },
});
