import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Signal, PriceData } from '@/core/types';
import { formatNumber, timeAgo } from '@/core/format';
import { calcOpenPips, getPipMultiplier, pipsBetween } from '@/core/pips';
import { Spacing, type Palette } from '@/core/theme';
import { AppText, Badge, Card, ConfidenceBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Animated, AnimatedPressable, FadeInUp } from '@/lib/animations';

function typeBadge(type: Signal['type'], t: TFunction, colors: Palette) {
  switch (type) {
    case 'BUY':
      return { label: 'BUY', color: colors.success, icon: 'arrow-up' as const };
    case 'SELL':
      return { label: 'SELL', color: colors.destructive, icon: 'arrow-down' as const };
    default:
      return { label: t('components.signalCard.waiting'), color: colors.warning, icon: 'pause' as const };
  }
}

function statusBadge(status: Signal['status'], t: TFunction, colors: Palette) {
  switch (status) {
    case 'tp':
      return { label: 'TP', color: colors.success };
    case 'sl':
      return { label: 'SL', color: colors.destructive };
    case 'active':
      return { label: t('components.signalCard.active'), color: colors.success };
    default:
      return { label: t('components.signalCard.pending'), color: colors.textMuted };
  }
}

function decimalsFor(pair: string): number {
  if (pair.includes('JPY')) return 3;
  if (pair.includes('XAU') || pair.includes('BTC')) return 2;
  return 5;
}

function parseLive(price: PriceData | undefined): number | null {
  const n = Number(price?.price);
  return price && isFinite(n) && n > 0 ? n : null;
}

function LevelLadder({
  entry,
  stopLoss,
  takeProfit,
  live,
  pair,
}: {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  live: number | null;
  pair: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const dec = decimalsFor(pair);
  const tpPips = pipsBetween(entry, takeProfit, pair);
  const slPips = pipsBetween(entry, stopLoss, pair);

  const levels = [
    { key: 'tp', price: takeProfit, color: colors.success, label: 'TP', pips: tpPips },
    ...(live !== null ? [{ key: 'live', price: live, color: colors.text, label: '●', pips: null as number | null, isLive: true }] : []),
    { key: 'entry', price: entry, color: colors.accent, label: t('components.signalCard.entry'), pips: null as number | null },
    { key: 'sl', price: stopLoss, color: colors.destructive, label: 'SL', pips: slPips },
  ];

  return (
    <View style={styles.levelsContainer}>
      {levels.map((lvl) => (
        <View key={lvl.key} style={styles.levelRow}>
          <View style={[styles.levelDot, { backgroundColor: lvl.color }]} />
          <View style={styles.levelInfo}>
            <AppText variant="small" style={{ color: lvl.color, fontWeight: '700' }}>
              {lvl.label}
            </AppText>
          </View>
          <AppText variant="mono" style={{ color: lvl.color, fontWeight: '600' }}>
            {formatNumber(lvl.price, dec)}
          </AppText>
          {lvl.pips !== null ? (
            <AppText variant="small" style={{ color: lvl.color }}>
              {t('components.signalCard.pips', { count: Math.round(lvl.pips) })}
            </AppText>
          ) : lvl.isLive ? (
            <AppText variant="small" style={{ color: colors.textMuted }}>{t('components.signalCard.now')}</AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function SignalCard({
  signal,
  onPress,
  showReasons = true,
  price,
}: {
  signal: Signal;
  onPress?: () => void;
  showReasons?: boolean;
  price?: PriceData;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const type = typeBadge(signal.type, t, colors);
  const status = statusBadge(signal.status, t, colors);
  const mult = getPipMultiplier(signal.pair);
  const entryPips = Math.abs(signal.takeProfit - signal.entry) * mult;
  const slPips = Math.abs(signal.stopLoss - signal.entry) * mult;
  const rr = slPips > 0 ? (entryPips / slPips).toFixed(1) : '—';
  const live = parseLive(price);
  const openPips = live !== null ? calcOpenPips(signal.entry, live, signal.type, signal.pair) : null;
  const isProfitable = openPips !== null && openPips > 0;

  return (
    <Animated.View entering={FadeInUp.delay(50).springify()}>
      <AnimatedPressable onPress={onPress}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AppText variant="h2">{signal.pair}</AppText>
              <View style={[styles.typePill, { backgroundColor: `${type.color}1F` }]}>
                <Ionicons name={type.icon} size={12} color={type.color} />
                <AppText variant="small" style={{ color: type.color, fontWeight: '800' }}>{type.label}</AppText>
              </View>
            </View>
            <Badge bg={`${status.color}1F`} color={status.color}>{status.label}</Badge>
          </View>

          <View style={styles.meta}>
            <AppText variant="muted">{signal.timeframe}</AppText>
            <AppText variant="muted">•</AppText>
            <AppText variant="muted">{t('components.signalCard.rr', { value: 1 })}{rr}</AppText>
            <View style={styles.spacer} />
            <AppText variant="small" style={{ color: colors.textFaint }}>{timeAgo(signal.createdAt)}</AppText>
          </View>

          <ConfidenceBar value={signal.confidence} />

          <LevelLadder
            entry={signal.entry}
            stopLoss={signal.stopLoss}
            takeProfit={signal.takeProfit}
            live={live}
            pair={signal.pair}
          />

          {live !== null && openPips !== null ? (
            <View style={styles.liveRow}>
              <AppText variant="small" style={{ color: colors.textMuted }}>
                {isProfitable ? t('components.signalCard.inProfit') : openPips < 0 ? t('components.signalCard.inLoss') : t('components.signalCard.atPoint')} ·
              </AppText>
              <AppText variant="small" style={{ color: isProfitable ? colors.success : openPips < 0 ? colors.destructive : colors.textMuted, fontWeight: '800' }}>
                {openPips > 0 ? '+' : ''}{t('components.signalCard.pips', { count: openPips.toFixed(1) })}
              </AppText>
            </View>
          ) : null}

          {showReasons && signal.reasons.length > 0 ? (
            <View style={styles.reasons}>
              <AppText variant="small" style={{ color: colors.textMuted, fontWeight: '600' }}>
                {t('components.signalCard.analysis')}
              </AppText>
              {signal.reasons.slice(0, 2).map((r, i) => (
                <View key={i} style={styles.reasonRow}>
                  <Ionicons name="checkmark-circle" size={13} color={type.color} />
                  <AppText variant="small" style={{ flex: 1 }}>{r}</AppText>
                </View>
              ))}
              {signal.reasons.length > 2 ? (
                <AppText variant="small" style={{ color: colors.textMuted }}>
                  {t('components.signalCard.moreReasons', { count: signal.reasons.length - 2 })}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </Card>
      </AnimatedPressable>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { marginBottom: Spacing.md, gap: Spacing.sm + Spacing.xs },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    spacer: { flex: 1 },
    levelsContainer: { gap: 6, marginTop: Spacing.xs },
    levelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    levelDot: { width: 6, height: 6, borderRadius: 3 },
    levelInfo: { flex: 1 },
    liveRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    reasons: { gap: Spacing.xs, marginTop: Spacing.xs },
    reasonRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  });
