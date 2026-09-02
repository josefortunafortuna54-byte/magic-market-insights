import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge, Card, Divider, Screen, SectionTitle } from '@/components/ui';
import { AddTradeModal } from '@/components/AddTradeModal';
import { ExportButton } from '@/components/admin/ExportButton';
import { useTradeJournal } from '@/hooks/useTradeJournal';
import { useTourTarget } from '@/components/tour/registry';
import { formatMoney } from '@/core/format';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { TradeEntry } from '@/core/types';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function tradeDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function DayCell({
  day,
  isSelected,
  hasTrades,
  pnl,
  isToday,
  onPress,
}: {
  day: number | null;
  isSelected: boolean;
  hasTrades: boolean;
  pnl: number;
  isToday: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (day === null) return <View style={styles.dayEmpty} />;
  const dotColor = pnl > 0 ? colors.success : pnl < 0 ? colors.destructive : colors.textFaint;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dayCell,
        isSelected && styles.daySelected,
        isToday && !isSelected && styles.dayToday,
      ]}>
      <AppText
        variant="small"
        style={[
          styles.dayNum,
          isSelected && styles.dayNumSelected,
          isToday && !isSelected && styles.dayNumToday,
        ]}>
        {day}
      </AppText>
      {hasTrades ? (
        <View style={[styles.dayDot, { backgroundColor: dotColor }]} />
      ) : isToday ? (
        <View style={[styles.dayDot, { backgroundColor: colors.accent }]} />
      ) : null}
    </Pressable>
  );
}

function TradeRow({ trade, onDelete }: { trade: TradeEntry; onDelete: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const isWin = trade.result === 'WIN';
  const isLoss = trade.result === 'LOSS';
  const color = isWin ? colors.success : isLoss ? colors.destructive : colors.textMuted;
  const icon = isWin ? 'arrow-up-circle' : isLoss ? 'arrow-down-circle' : 'remove-circle';
  const pnlSign = trade.profitUsd >= 0 ? '+' : '';
  return (
    <View style={styles.tradeRow}>
      <View style={[styles.tradeIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.tradeInfo}>
        <View style={styles.tradeTop}>
          <AppText variant="label" style={{ fontWeight: '700' }}>{trade.pair}</AppText>
          <View style={[styles.dirBadge, { backgroundColor: `${color}18` }]}>
            <Ionicons name={isWin ? 'arrow-up' : isLoss ? 'arrow-down' : 'remove'} size={10} color={color} />
            <AppText variant="small" style={{ color, fontWeight: '700', fontSize: 11 }}>{trade.direction}</AppText>
          </View>
        </View>
        {trade.notes ? (
          <AppText variant="small" numberOfLines={1} style={{ color: colors.textMuted }}>
            {trade.notes}
          </AppText>
        ) : null}
      </View>
      <View style={styles.tradeRight}>
        <AppText variant="label" style={{ color, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {pnlSign}{formatMoney(trade.profitUsd)}
        </AppText>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={13} color={colors.textFaint} />
        </Pressable>
      </View>
    </View>
  );
}

export default function DiarioTraderScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const { trades, addTrade, removeTrade } = useTradeJournal();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [showAdd, setShowAdd] = useState(false);
  const titleRef = useTourTarget('tour:diario-title');

  const exportColumns = [
    { key: 'date', label: 'Data' },
    { key: 'pair', label: 'Par' },
    { key: 'dir', label: 'Direção' },
    { key: 'entry', label: 'Entrada' },
    { key: 'exit', label: 'Saída' },
    { key: 'lots', label: 'Lotes' },
    { key: 'result', label: 'Resultado' },
    { key: 'pnl', label: 'PnL (USD)' },
    { key: 'pips', label: 'Pips' },
    { key: 'notes', label: 'Notas' },
  ];
  const exportData = trades.map((t) => ({
    date: t.createdAt.slice(0, 10),
    pair: t.pair,
    dir: t.direction,
    entry: t.entryPrice,
    exit: t.exitPrice ?? '',
    lots: t.lotSize,
    result: t.result,
    pnl: t.profitUsd,
    pips: t.pips,
    notes: t.notes,
  }));

  const todayKey = localDateKey(now);
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);
  const monthLabel = new Date(year, month).toLocaleString(Platform.OS === 'ios' ? undefined : 'pt-AO', { month: 'long', year: 'numeric' });

  const dateKey = (d: number) => localDateKey(new Date(year, month, d));

  const selectedKey = dateKey(selectedDay);
  const selectedTrades = useMemo(
    () => trades.filter((t) => tradeDateKey(t.createdAt) === selectedKey),
    [trades, selectedKey],
  );
  const selectedPnl = selectedTrades.reduce((s, t) => s + t.profitUsd, 0);

  const tradesByDay = useMemo(() => {
    const map = new Map<string, { count: number; pnl: number }>();
    for (const t of trades) {
      const key = tradeDateKey(t.createdAt);
      const prev = map.get(key) ?? { count: 0, pnl: 0 };
      map.set(key, { count: prev.count + 1, pnl: prev.pnl + t.profitUsd });
    }
    return map;
  }, [trades]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('diario.deleteTrade'), t('diario.deleteTradeConfirm'), [
      { text: t('diario.cancel'), style: 'cancel' },
      { text: t('diario.delete'), style: 'destructive', onPress: () => removeTrade(id) },
    ]);
  };

  const monthTrades = trades.filter((t) => {
    const d = tradeDateKey(t.createdAt).slice(0, 7);
    return d === `${year}-${String(month + 1).padStart(2, '0')}`;
  });
  const monthPnl = monthTrades.reduce((s, t) => s + t.profitUsd, 0);
  const monthWins = monthTrades.filter((t) => t.result === 'WIN').length;
  const monthWinRate = monthTrades.length > 0 ? Math.round((monthWins / monthTrades.length) * 100) : 0;

  return (
    <Screen>
      <View ref={titleRef} collapsable={false}>
        <SectionTitle
          right={
            <ExportButton
              data={exportData}
              filename="tmt-diario"
              columns={exportColumns}
              label={t('diario.exportCsv')}
            />
          }>
          {t('diario.title')}
        </SectionTitle>
      </View>
      <AppText variant="muted" style={{ marginBottom: Spacing.lg }}>
        {t('diario.subtitle')}
      </AppText>

      {/* Calendar */}
      <Card style={styles.calendarCard}>
        <View style={styles.monthNav}>
          <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>
          <AppText variant="h2" style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}>
            {monthLabel}
          </AppText>
          <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.accent} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <AppText key={w} variant="small" style={styles.weekLabel}>{w}</AppText>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {monthDays.map((day, i) => {
            if (day === null) return <View key={`pad-${i}`} style={styles.dayEmpty} />;
            const key = dateKey(day);
            const dayData = tradesByDay.get(key);
            const isToday = key === todayKey;
            return (
              <DayCell
                key={key}
                day={day}
                isSelected={day === selectedDay}
                hasTrades={(dayData?.count ?? 0) > 0}
                pnl={dayData?.pnl ?? 0}
                isToday={isToday}
                onPress={() => setSelectedDay(day)}
              />
            );
          })}
        </View>
      </Card>

      {/* Month Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <AppText variant="small" style={styles.statLabel}>{t('diario.monthTrades')}</AppText>
          <AppText variant="h1" style={styles.statValue}>{monthTrades.length}</AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <AppText variant="small" style={styles.statLabel}>{t('diario.monthWinRate')}</AppText>
          <AppText variant="h1" style={[styles.statValue, { color: colors.success }]}>{monthWinRate}%</AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <AppText variant="small" style={styles.statLabel}>{t('diario.monthPnl')}</AppText>
          <AppText variant="h1" style={[styles.statValue, { color: monthPnl >= 0 ? colors.success : colors.destructive }]}>
            {monthPnl >= 0 ? '+' : ''}{formatMoney(monthPnl)}
          </AppText>
        </View>
      </View>

      {/* Day Header */}
      <View style={styles.dayHeader}>
        <View>
          <AppText variant="h2">{t('diario.dayTitle', { date: selectedKey })}</AppText>
          {selectedTrades.length > 0 ? (
            <AppText variant="small" style={{ color: colors.textMuted, marginTop: 2 }}>
              {selectedTrades.length} {t('diario.tradesCount')}
              {selectedPnl !== 0 ? ` · ${selectedPnl >= 0 ? '+' : ''}${formatMoney(selectedPnl)} USD` : ''}
            </AppText>
          ) : null}
        </View>
        <AppButton
          title={t('diario.addTrade')}
          variant="primary"
          icon={<Ionicons name="add" size={16} color="#FFF" />}
          onPress={() => setShowAdd(true)}
          style={styles.addBtn}
        />
      </View>

      {/* Trades List */}
      {selectedTrades.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyRow}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={24} color={colors.textFaint} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{t('diario.noTrades')}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{t('diario.noTradesHint')}</AppText>
            </View>
          </View>
        </Card>
      ) : (
        <Card style={styles.tradesCard}>
          {selectedTrades.map((trade, i) => (
            <View key={trade.id}>
              {i > 0 ? <Divider style={{ marginVertical: Spacing.xs }} /> : null}
              <TradeRow trade={trade} onDelete={() => handleDelete(trade.id)} />
            </View>
          ))}
        </Card>
      )}

      <AddTradeModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(entry) => {
          const dateStr = dateKey(selectedDay);
          addTrade({ ...entry, createdAt: `${dateStr}T12:00:00.000` });
        }}
      />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  calendarCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    color: c.textFaint,
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    gap: 3,
  },
  daySelected: {
    backgroundColor: c.accent,
  },
  dayToday: {
    backgroundColor: `${c.accent}15`,
  },
  dayEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  dayNum: {
    color: c.textBody,
    fontWeight: '500',
    fontSize: 13,
  },
  dayNumSelected: {
    color: '#000',
    fontWeight: '800',
  },
  dayNumToday: {
    color: c.accent,
    fontWeight: '700',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: c.border,
  },
  statLabel: {
    color: c.textFaint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  emptyCard: {
    padding: Spacing.xl,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradesCard: {
    gap: Spacing.xs,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  tradeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeInfo: {
    flex: 1,
    gap: 3,
  },
  tradeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dirBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tradeRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deleteBtn: {
    padding: 4,
  },
});
