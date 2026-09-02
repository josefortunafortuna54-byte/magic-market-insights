import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { SectionHeader } from '@/components/SectionHeader';
import { useTheme } from '@/hooks/useTheme';
import type { Channel, Signal } from '@/core/types';
import { Spacing, type Palette } from '@/core/theme';
import { isForexSymbol, isWeekendUtc } from '@/core/community';

const normalizePair = (s: string | null | undefined): string =>
  (s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

function bestForPair(signals: Signal[], pair: string): Signal | null {
  const key = normalizePair(pair);
  const matches = signals.filter(
    (s) =>
      (s.status === 'active' || s.status === 'pending') &&
      normalizePair(s.pair) === key,
  );
  if (!matches.length) return null;
  return [...matches].sort(
    (a, b) => b.confidence - a.confidence || (b.riskReward ?? 0) - (a.riskReward ?? 0),
  )[0];
}

function channelAvailable(channel: Channel): boolean {
  if (channel.type === 'pair' && isWeekendUtc() && isForexSymbol(channel.pair || channel.name)) {
    return false;
  }
  return true;
}

export function ChannelSignals({
  channels,
  signals,
}: {
  channels: Channel[];
  signals: Signal[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const rows = useMemo(() => {
    return channels
      .filter((c) => c.pair && channelAvailable(c))
      .map((c) => ({ channel: c, signal: bestForPair(signals, c.pair as string) }))
      .filter((r) => r.signal !== null) as { channel: Channel; signal: Signal }[];
  }, [channels, signals]);

  if (!rows.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t('inicio.channelSignalsTitle')}
        subtitle={t('inicio.channelSignalsSubtitle')}
      />
      {rows.map(({ channel, signal }) => {
        const color =
          signal.type === 'BUY' ? colors.success : signal.type === 'SELL' ? colors.destructive : colors.warning;
        return (
          <Pressable
            key={channel.id}
            onPress={() => router.push(`/comunidade/canais/${channel.id}` as never)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <View style={styles.iconWrap}>
              <AppText style={{ fontSize: 16 }}>{channel.icon || '💬'}</AppText>
            </View>
            <View style={styles.textWrap}>
              <AppText variant="label" numberOfLines={1}>{channel.display_name}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }} numberOfLines={1}>
                {signal.timeframe}{signal.smcSetup ? ` · ${signal.smcSetup}` : ''}
              </AppText>
            </View>
            <View style={[styles.typePill, { backgroundColor: `${color}1F` }]}>
              <Ionicons name={signal.type === 'BUY' ? 'arrow-up' : signal.type === 'SELL' ? 'arrow-down' : 'pause'} size={12} color={color} />
              <AppText variant="small" style={{ color, fontWeight: '800' }}>{signal.pair.split('/')[0]}</AppText>
            </View>
            <View style={styles.confWrap}>
              <Ionicons name="pulse" size={12} color={colors.textFaint} />
              <AppText variant="small" style={{ color: colors.textBody, fontWeight: '700' }}>
                {signal.confidence}%
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  section: { marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceElevated,
  },
  textWrap: { flex: 1 },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  confWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 46,
    justifyContent: 'flex-end',
  },
});
