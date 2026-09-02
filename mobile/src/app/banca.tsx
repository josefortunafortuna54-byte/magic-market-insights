import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge, Card, Screen, SectionTitle } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PremiumLock } from '@/components/PremiumLock';
import { GrowthPlanSection } from '@/components/GrowthPlanSection';
import { CapitalSimulatorCard } from '@/components/CapitalSimulatorCard';
import { formatBancaMoney, formatShortDate } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBanca } from '@/hooks/useBanca';
import { useSubscription } from '@/hooks/useSubscription';
import { useCapitalAccount } from '@/hooks/useCapitalAccount';
import { useMovements } from '@/hooks/useMovements';

function StatusPill({ label, color }: { label: string; color: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <AppText variant="small" style={{ color, fontWeight: '600' }}>{label}</AppText>
    </View>
  );
}

export default function BancaScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const router = useRouter();
  const { canAccessBanca, loading: subLoading } = useSubscription();
  const { config, loading } = useBanca();
  const { account, reports } = useCapitalAccount();
  const { movements } = useMovements();

  // Regra absoluta: um cliente premium NUNCA vê bloqueio. Enquanto o plano
  // não está confirmado, mostramos loading — nunca a restrição.
  if (!subLoading && !canAccessBanca) {
    return (
      <Screen>
        <PremiumLock
          label={t('capital.lockTitle')}
          description={t('capital.lockDesc')}
        />
      </Screen>
    );
  }

  if (loading || subLoading) return <Screen><AppText variant="muted">{t('capital.loading')}</AppText></Screen>;

  // Servidor é a fonte da verdade; config local é fallback (offline/ainda sem conta).
  const capital = account?.capital ?? config.capital;
  const current = account?.achieved ?? config.achieved;
  const cur = account?.currency ?? config.currency ?? 'usd';
  const totalWithdrawn = account?.total_withdrawn ?? config.totalWithdrawn;
  const latestReport = reports[0] ?? null;
  const profit = current - capital;
  const profitPct = capital > 0 ? (profit / capital) * 100 : 0;
  const isProfit = profit >= 0;
  const targetPct = config.metaPercent;
  const targetValue = capital * (targetPct / 100);
  const progressPct = targetValue > 0 ? Math.min(100, Math.max(0, (profit / targetValue) * 100)) : 0;
  // Total investido: maior entre o capital publicado pela equipa e os depósitos
  // registados na carteira (mesma moeda), nunca abaixo do capital atual.
  const walletDeposits = movements
    .filter((m) => m.type === 'deposit' && m.status !== 'recusado' && m.currency === cur)
    .reduce((sum, m) => sum + m.amount, 0);
  const totalInvested = Math.max(walletDeposits, capital);

  // Estado binário: a gestão de capital está ativa (existe conta publicada
  // pela equipa ou há capital registado) ou ainda não começou.
  const hasManagement = Boolean(account) || capital > 0 || current > 0;

  if (!hasManagement) {
    return (
      <Screen>
        <SectionTitle>{t('capital.title')}</SectionTitle>
        <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
          {t('capital.subtitle')}
        </AppText>

        <GradientCard
          colors={[`${colors.accent}26`, `${colors.primary}12`]}
          style={styles.hero}>
          <AppText variant="small" style={[styles.heroEyebrow, { color: colors.accent }]}>
            {t('capital.inactiveEyebrow')}
          </AppText>
          <AppText variant="mono" style={styles.heroValue}>+25%</AppText>
          <AppText variant="small" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {t('capital.inactiveHeroDesc')}
          </AppText>
          <View style={styles.heroFooter}>
            <AppText variant="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {t('capital.minDeposit')}: $50 USD
            </AppText>
            <StatusPill label={t('capital.inactiveBadge')} color={colors.warning} />
          </View>
        </GradientCard>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant="label">{t('capital.howItWorks')}</AppText>
          </View>
          {[
            { icon: 'wallet', color: colors.success, title: t('capital.step1Title'), desc: t('capital.step1Desc') },
            { icon: 'trending-up', color: colors.accent, title: t('capital.step2Title'), desc: t('capital.step2Desc') },
            { icon: 'cash', color: colors.warning, title: t('capital.step3Title'), desc: t('capital.step3Desc') },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: `${step.color}18` }]}>
                <Ionicons name={step.icon as any} size={18} color={step.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{step.title}</AppText>
                <AppText variant="small" style={{ color: colors.textMuted }}>{step.desc}</AppText>
              </View>
            </View>
          ))}
        </Card>

        <CapitalSimulatorCard
          capital={0}
          currency="usd"
          strategy={config.planId}
          onDeposit={(amount) =>
            router.push({
              pathname: '/depositos',
              params: { amount: String(Math.round(amount * 100) / 100), currency: 'usd' },
            })
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle>{t('capital.title')}</SectionTitle>
      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
        {t('capital.subtitle')}
      </AppText>

      <GradientCard
        colors={[colors.primaryDim, 'rgba(22,164,58,0.15)']}
        style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" style={styles.heroEyebrow}>{t('capital.currentBalance')}</AppText>
          </View>
          <StatusPill label={t('capital.active')} color={colors.success} />
        </View>
        <AppText variant="mono" style={[styles.heroValue, { color: isProfit ? colors.text : colors.destructive }]}>
          {formatBancaMoney(current, cur)}
        </AppText>
        <View style={styles.heroFooter}>
          <AppText variant="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {t('capital.deposited')}{formatBancaMoney(capital, cur)}
          </AppText>
          <AppText variant="small" style={{ color: isProfit ? colors.success : colors.destructive }}>
            {isProfit ? '+' : ''}{formatBancaMoney(profit, cur)} ({profitPct > 0 ? '+' : ''}{profitPct.toFixed(1)}%)
          </AppText>
        </View>
      </GradientCard>

      {latestReport ? (
        <Pressable onPress={() => router.push('/diario-trader')}>
          <Card style={styles.reportCard}>
            <View style={styles.cardHeader}>
              <View style={styles.reportTitleRow}>
                <Ionicons name="document-text" size={15} color={colors.accent} />
                <AppText variant="label">{t('capital.latestReport')}</AppText>
              </View>
              <Badge
                color={latestReport.profit >= 0 ? colors.success : colors.destructive}
                bg={latestReport.profit >= 0 ? `${colors.success}20` : `${colors.destructive}20`}>
                {`${latestReport.profit >= 0 ? '+' : ''}${latestReport.profit_pct.toFixed(1)}%`}
              </Badge>
            </View>
            <View style={styles.reportRow}>
              <AppText variant="small" style={{ color: colors.textMuted }}>
                {formatShortDate(latestReport.period_start)} – {formatShortDate(latestReport.period_end)}
              </AppText>
              <AppText variant="label" style={{ color: latestReport.profit >= 0 ? colors.success : colors.destructive }}>
                {`${latestReport.profit >= 0 ? '+' : ''}${formatBancaMoney(latestReport.profit, cur)}`}
              </AppText>
            </View>
            {latestReport.note ? (
              <AppText variant="small" style={{ color: colors.textMuted }} numberOfLines={2}>
                {latestReport.note}
              </AppText>
            ) : null}
          </Card>
        </Pressable>
      ) : null}

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Ionicons name="wallet" size={18} color={colors.text} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.invested')}</AppText>
          <AppText variant="label">{formatBancaMoney(totalInvested, cur)}</AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="trending-up" size={18} color={colors.success} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.profit')}</AppText>
          <AppText variant="label" style={{ color: colors.success }}>+{formatBancaMoney(profit, cur)}</AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="flag" size={18} color={colors.accent} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.target')}</AppText>
          <AppText variant="label" style={{ color: colors.accent }}>+{targetPct}%</AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="cash" size={18} color={colors.warning} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.withdrawn')}</AppText>
          <AppText variant="label" style={{ color: colors.warning }}>{formatBancaMoney(totalWithdrawn, cur)}</AppText>
        </Card>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.progressTitle')}</AppText>
          <AppText variant="small" style={{ color: colors.textMuted }}>{Math.round(progressPct)}%</AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progressPct}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <AppText variant="small" style={{ color: colors.textMuted }}>
            +{formatBancaMoney(profit, cur)}
          </AppText>
          <AppText variant="small" style={{ color: colors.accent }}>
            Meta: +{formatBancaMoney(targetValue, cur)}
          </AppText>
        </View>
      </Card>

      <CapitalSimulatorCard capital={capital} currency={cur} strategy={config.planId} />

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.withdrawalTitle')}</AppText>
          <Badge color={colors.success} bg={`${colors.success}20`}>{t('capital.weekly')}</Badge>
        </View>
        <AppText variant="muted" style={{ marginBottom: Spacing.sm }}>
          {t('capital.withdrawalDesc')}
        </AppText>
        <AppButton
          title={t('capital.requestWithdrawal')}
          variant="secondary"
          icon={<Ionicons name="cash-outline" size={18} color={colors.accent} />}
          onPress={() => Alert.alert(t('capital.withdrawalRequest'), t('capital.withdrawalMsg'))}
        />
      </Card>

      <GrowthPlanSection capital={capital} currency={cur} />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  hero: { gap: Spacing.sm, marginBottom: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 },
  heroValue: { fontSize: 36, lineHeight: 46, color: c.text, letterSpacing: 0.5 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flexGrow: 1, flexBasis: '46%', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md },
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportCard: { marginBottom: Spacing.md, gap: Spacing.sm },
  reportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 8, borderRadius: 4, backgroundColor: c.surfaceElevated,
    overflow: 'hidden', marginTop: Spacing.xs,
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: c.accent },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
