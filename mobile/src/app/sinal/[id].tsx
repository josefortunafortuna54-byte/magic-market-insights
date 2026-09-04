import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppButton, AppText, Badge, Divider, EmptyState, Screen, Spinner } from '@/components/ui';
import { SignalCard } from '@/components/SignalCard';
import { TradingViewChart } from '@/components/TradingViewChart';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_LIMITS } from '@/core/gating';
import { findSinaisChannelId, shareSignalToFeed } from '@/lib/community';
import { useTranslation } from 'react-i18next';
import { formatDateTimeWAT, formatSymbol, formatTimeframe, formatType } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Signal, SignalStatus } from '@/core/types';

function determineStatus(status: string | null, confidence: number): SignalStatus {
  if (status === 'tp' || status === 'sl' || status === 'active' || status === 'pending') {
    return status;
  }
  return Number(confidence) >= 70 ? 'active' : 'pending';
}

export default function SignalDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { planTier } = useSubscription();
  const [sharing, setSharing] = useState(false);
  const limits = PLAN_LIMITS[planTier] ?? PLAN_LIMITS.free;

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
        status: determineStatus(row.status, Number(row.confidence)),
        smcSetup: row.smc_setup ?? undefined,
      } as Signal;
    },
  });

  const { prices } = useLivePrices(signal ? [signal.pair] : []);

  if (isLoading) return <Screen><Spinner label={t('sinal.loading')} /></Screen>;
  if (error || !signal) return <Screen><EmptyState title={t('sinal.notFound')} subtitle={error?.message} /></Screen>;

  const share = () => {
    const text = t('sinal.shareText', {
      entry: signal.entry,
      sl: signal.stopLoss,
      tp: signal.takeProfit,
      confidence: `${signal.confidence}%`,
    });
    Share.share({ message: text }).catch(() => {});
  };

  const shareToFeed = async () => {
    if (sharing) return;
    if (!user) {
      Alert.alert(t('workspace.shareLogin'));
      return;
    }
    setSharing(true);
    const res = await shareSignalToFeed(user.id, signal.id);
    setSharing(false);
    if (!res.ok) {
      Alert.alert(t('workspace.shareFailed'), res.error);
      return;
    }
    Alert.alert(t('workspace.sharedToFeed'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('workspace.viewFeed'),
        onPress: () => {
          findSinaisChannelId().then((channelId) => {
            if (channelId) {
              router.push({
                pathname: '/comunidade/canais/[channelId]',
                params: { channelId },
              });
            }
          });
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: `${signal.pair} ${signal.timeframe}`,
          headerRight: () => (
            <Pressable onPress={share} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppText variant="h1">{signal.pair}</AppText>
          <Badge
            color={signal.type === 'BUY' ? colors.success : signal.type === 'SELL' ? colors.destructive : colors.warning}
            bg={`${signal.type === 'BUY' ? colors.success : signal.type === 'SELL' ? colors.destructive : colors.warning}1F`}>
            {signal.type}
          </Badge>
          <Badge color={colors.textMuted} bg={`${colors.textMuted}1F`}>{signal.timeframe}</Badge>
        </View>
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {formatDateTimeWAT(signal.createdAt)}
        </AppText>
      </View>

      <TradingViewChart
        pair={signal.pair}
        timeframe={signal.timeframe}
        height={400}
        entry={signal.entry}
        stopLoss={signal.stopLoss}
        takeProfit={signal.takeProfit}
      />

      <SignalCard signal={signal} showReasons={false} price={prices[signal.pair]} />

      <AppButton
        title={t('workspace.shareToFeed')}
        onPress={shareToFeed}
        loading={sharing}
        variant="secondary"
        icon={<Ionicons name="chatbubbles-outline" size={16} color={colors.accent} />}
        style={styles.shareBtn}
      />

      <AppText variant="label" style={{ color: colors.textMuted, marginVertical: Spacing.sm }}>
        {t('sinal.technical')}
      </AppText>
      {!limits.hasAnalysis ? (
        <View style={styles.reasonLocked}>
          <Ionicons name="lock-closed" size={16} color={colors.accent} />
          <AppText variant="small" style={{ color: colors.accent }}>
            {t('analises.premiumDesc')}
          </AppText>
        </View>
      ) : signal.reasons.length === 0 ? (
        <EmptyState title={t('sinal.noReasons')} />
      ) : (
        signal.reasons.map((r, i) => (
          <View key={i} style={styles.reasonRow}>
            <AppText style={styles.reasonBullet}>•</AppText>
            <AppText style={{ flex: 1, lineHeight: 22 }}>{r}</AppText>
          </View>
        ))
      )}

      {signal.smcSetup && (
        <View style={styles.smcRow}>
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('sinal.smcSetup')}:</AppText>
          <Badge color={colors.accent} bg={`${colors.accent}1F`}>{signal.smcSetup}</Badge>
        </View>
      )}

      <Divider />

      <View style={[styles.warning, { marginBottom: Spacing.md }]}>
        <AppText variant="small" style={{ color: colors.warning }}>
          ⚠️ {t('sinal.riskWarning')}
        </AppText>
      </View>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  header: { gap: Spacing.sm, marginVertical: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  shareBtn: { marginBottom: Spacing.md },
  reasonRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  reasonBullet: { color: c.primary, fontWeight: '800' },
  smcRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  reasonLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${c.accent}12`,
    borderColor: `${c.accent}40`,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  warning: {
    backgroundColor: `${c.warning}12`,
    borderColor: `${c.warning}40`,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
  },
});
