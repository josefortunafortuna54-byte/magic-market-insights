import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, Divider } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { MetricGrid } from '@/components/MetricGrid';
import { formatBancaMoney, formatMoney, formatShortDate } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BancaConfig } from '@/core/types';
import { useMovements, type WalletMovement } from '@/hooks/useMovements';
import { planLabel, type PlanId } from '@/lib/plans';

function MovementRow({ m, index, onPress }: { m: WalletMovement; index: number; onPress?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const isDeposit = m.type === 'deposit';
  const color = isDeposit ? colors.success : colors.accent;
  const amount = m.currency === 'usd' ? `$${formatMoney(m.amount)}` : `${formatMoney(m.amount)} Kz`;
  const label = isDeposit
    ? t('depositos.movementDeposit', { plan: m.plan ? planLabel(m.plan as Exclude<PlanId, 'free'>) : t('depositos.depositSection') })
    : t('depositos.movementWithdraw');
  return (
    <Pressable key={m.id} onPress={onPress} style={styles.movementRow}>
      <View style={[styles.movementIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={isDeposit ? 'arrow-down-circle' : 'arrow-up-circle'} size={16} color={color} />
      </View>
      <View style={styles.movementText}>
        <AppText style={{ color: colors.textBody }}>{label}</AppText>
        <AppText variant="small" style={{ color: colors.textFaint }}>
          {formatShortDate(m.createdAt)} · {m.status === 'concluido' ? t('depositos.statusConcluido') : t('depositos.statusPendente')}
        </AppText>
      </View>
      <AppText variant="label" style={{ color }}>{`${isDeposit ? '+' : '-'}${amount}`}</AppText>
      {index > 0 ? <Divider style={styles.movementDivider} /> : null}
    </Pressable>
  );
}

export function WalletCard({ config }: { config: BancaConfig }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { movements, loading } = useMovements();
  const cur = config.currency ?? 'usd';
  const metaValue = config.capital * (config.metaPercent / 100);
  const progress = config.achieved - config.capital;
  const progressPct = metaValue > 0 ? Math.min(100, Math.max(0, (progress / metaValue) * 100)) : 0;
  const aboveCapital = progress >= 0;

  return (
    <View style={styles.wrap}>
      <GradientCard
        colors={[colors.primaryDim, 'rgba(22,164,58,0.15)']}
        style={styles.balance}>
        <View style={styles.balanceHeader}>
          <AppText variant="small" style={styles.eyebrow}>{t('components.walletCard.balance')}</AppText>
          <View style={styles.walletIcon}>
            <Ionicons name="wallet" size={18} color={colors.success} />
          </View>
        </View>
        <AppText variant="mono" style={[styles.balanceValue, { color: aboveCapital ? colors.text : colors.destructive }]}>
          {formatBancaMoney(config.achieved, cur)}
        </AppText>
        <View style={styles.balanceFooter}>
          <AppText variant="small" style={{ color: colors.textMuted }}>
            {t('components.walletCard.capitalBase')}{formatBancaMoney(config.capital, cur)}
          </AppText>
          <AppText variant="small" style={{ color: aboveCapital ? colors.success : colors.destructive }}>
            {aboveCapital ? '+' : ''}{formatBancaMoney(progress, cur === 'aoa' ? 'aoa' : 'usd')}
          </AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progressPct}%`, backgroundColor: aboveCapital ? colors.success : colors.destructive }]} />
        </View>
        <AppText variant="small" style={styles.metaCaption}>
          {t('components.walletCard.targetReturn')}+{formatBancaMoney(metaValue, cur)} ({config.metaPercent}%)
        </AppText>
      </GradientCard>

      <MetricGrid
        items={[
          { label: t('components.walletCard.capital'), value: formatBancaMoney(config.capital, cur), accent: colors.text },
          { label: t('components.walletCard.target'), value: `${config.metaPercent}%`, accent: colors.accent },
          { label: t('components.walletCard.riskPerOp'), value: `${config.riskPercent}%`, accent: colors.secondary },
        ]}
      />

      <View style={styles.movements}>
        <AppText variant="label" style={styles.sectionLabel}>{t('components.walletCard.movements')}</AppText>
        {loading ? (
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('common.loading')}</AppText>
        ) : movements.length === 0 ? (
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('depositos.empty')}</AppText>
        ) : (
          movements.map((m, i) => <MovementRow key={m.id} m={m} index={i} onPress={() => router.push('/depositos')} />)
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: Spacing.md },
    balance: { gap: Spacing.sm },
    balanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    eyebrow: { color: c.textMuted, fontWeight: '700', letterSpacing: 1 },
    walletIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.liveDim,
      borderColor: c.border,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    balanceValue: { fontSize: 34, lineHeight: 44, color: c.text, letterSpacing: 0.5 },
    balanceFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: c.surfaceElevated,
      overflow: 'hidden',
      marginTop: Spacing.xs,
    },
    fill: { height: '100%', borderRadius: 4 },
    metaCaption: { color: c.textMuted, marginTop: Spacing.xs },
    movements: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: Spacing.md,
    },
    sectionLabel: {
      color: c.textFaint,
      letterSpacing: 0.5,
      marginBottom: Spacing.sm,
    },
    movementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    movementIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    movementText: { flex: 1, gap: 1 },
    movementDivider: { marginVertical: Spacing.xs },
  });
