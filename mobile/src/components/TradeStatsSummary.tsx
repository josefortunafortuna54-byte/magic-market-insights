import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, Badge, Card, Divider, EmptyState } from '@/components/ui';
import { formatMoney } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { TradeEntry, TradeStats } from '@/core/types';

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <AppText variant="small" style={{ color: colors.textMuted }}>{label}</AppText>
      <AppText variant="label" style={{ color }}>{value}</AppText>
    </View>
  );
}

function TradeRow({ trade }: { trade: TradeEntry }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const color = trade.result === 'WIN' ? colors.success : trade.result === 'LOSS' ? colors.destructive : colors.textMuted;
  const icon = trade.result === 'WIN' ? 'arrow-up-circle' : trade.result === 'LOSS' ? 'arrow-down-circle' : 'remove-circle';
  const pnlSign = trade.profitUsd >= 0 ? '+' : '';
  return (
    <View style={styles.tradeRow}>
      <View style={[styles.tradeIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.tradeInfo}>
        <View style={styles.tradeTop}>
          <AppText variant="label">{trade.pair}</AppText>
          <Badge color={color} bg={`${color}20`}>{trade.direction}</Badge>
        </View>
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {trade.lotSize} lot · {trade.pips > 0 ? '+' : ''}{trade.pips} pips
        </AppText>
      </View>
      <AppText variant="label" style={{ color, fontWeight: '800' }}>
        {pnlSign}{formatMoney(trade.profitUsd)} USD
      </AppText>
    </View>
  );
}

export function TradeStatsSummary({
  stats,
  trades,
  todayPnl,
  weekPnl,
}: {
  stats: TradeStats;
  trades: TradeEntry[];
  todayPnl: number;
  weekPnl: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [expanded, setExpanded] = useState(false);
  const visibleTrades = expanded ? trades : trades.slice(0, 5);

  if (stats.totalTrades === 0) {
    return (
      <Card style={styles.emptyCard}>
        <View style={styles.emptyRow}>
          <Ionicons name="journal-outline" size={28} color={colors.textFaint} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">{t('banca.noTrades')}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>{t('banca.noTradesHint')}</AppText>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.pnlRow}>
        <Card style={styles.pnlCard}>
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('banca.todayPnl')}</AppText>
          <AppText variant="label" style={{ color: todayPnl >= 0 ? colors.success : colors.destructive }}>
            {todayPnl >= 0 ? '+' : ''}{formatMoney(todayPnl)} USD
          </AppText>
        </Card>
        <Card style={styles.pnlCard}>
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('banca.weekPnl')}</AppText>
          <AppText variant="label" style={{ color: weekPnl >= 0 ? colors.success : colors.destructive }}>
            {weekPnl >= 0 ? '+' : ''}{formatMoney(weekPnl)} USD
          </AppText>
        </Card>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label={t('banca.winRate')} value={`${Math.round(stats.winRate)}%`} color={colors.success} icon="trophy" />
        <StatCard label={t('banca.totalPnl')} value={`${stats.totalPnl >= 0 ? '+' : ''}${formatMoney(stats.totalPnl)}`} color={stats.totalPnl >= 0 ? colors.success : colors.destructive} icon="cash" />
        <StatCard label={t('banca.trades')} value={String(stats.totalTrades)} color={colors.accent} icon="bar-chart" />
        <StatCard label={t('banca.profitFactor')} value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(1)} color={colors.warning} icon="trending-up" />
      </View>

      <View style={styles.wlRow}>
        <View style={styles.wlItem}>
          <AppText variant="small" style={{ color: colors.success }}>● {t('banca.wins')}</AppText>
          <AppText variant="label" style={{ color: colors.success }}>{stats.wins}</AppText>
        </View>
        <View style={styles.wlItem}>
          <AppText variant="small" style={{ color: colors.destructive }}>● {t('banca.losses')}</AppText>
          <AppText variant="label" style={{ color: colors.destructive }}>{stats.losses}</AppText>
        </View>
        <View style={styles.wlItem}>
          <AppText variant="small" style={{ color: colors.textMuted }}>● {t('banca.breakevens')}</AppText>
          <AppText variant="label" style={{ color: colors.textMuted }}>{stats.breakevens}</AppText>
        </View>
      </View>

      {visibleTrades.length > 0 ? (
        <Card style={styles.tradesCard}>
          <AppText variant="label" style={{ marginBottom: Spacing.sm }}>{t('banca.recentTrades')}</AppText>
          {visibleTrades.map((t, i) => (
            <View key={t.id}>
              {i > 0 ? <Divider style={{ marginVertical: Spacing.xs }} /> : null}
              <TradeRow trade={t} />
            </View>
          ))}
          {trades.length > 5 && (
            <Pressable onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
              <AppText variant="small" style={{ color: colors.accent }}>
                {expanded ? t('banca.showLess') : t('banca.showAll', { count: trades.length })}
              </AppText>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accent} />
            </Pressable>
          )}
        </Card>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: Spacing.md },
    pnlRow: { flexDirection: 'row', gap: Spacing.sm },
    pnlCard: { flex: 1, gap: Spacing.xs },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    statCard: { width: '48%', flex: 1, gap: Spacing.xs, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: Spacing.md },
    statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
    wlRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xs },
    wlItem: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tradesCard: { gap: Spacing.xs },
    tradeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs },
    tradeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tradeInfo: { flex: 1, gap: 2 },
    tradeTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingTop: Spacing.sm },
    emptyCard: { padding: Spacing.lg },
    emptyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  });
