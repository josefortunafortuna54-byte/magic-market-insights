import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Badge, Card, EmptyState, Screen, SectionTitle } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PremiumLock } from '@/components/PremiumLock';
import { GrowthPlanSection } from '@/components/GrowthPlanSection';
import { ManagementEnded } from '@/components/ManagementEnded';
import { ContractCard } from '@/components/ContractCard';
import { CapitalSimulatorCard } from '@/components/CapitalSimulatorCard';
import { formatBancaMoney, formatShortDate } from '@/core/format';
import { contractEnded, formatMinDepositCore, profit, profitPct, progressPct, dailyGain } from '@/core/capital';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBanca } from '@/hooks/useBanca';
import { useSubscription } from '@/hooks/useSubscription';
import { useCapitalAccount } from '@/hooks/useCapitalAccount';
import { useCapitalContract } from '@/hooks/useCapitalContract';
import { useWithdrawalRequests } from '@/hooks/useWithdrawalRequests';
import { PAYMENT_METHODS } from '@/lib/plans';
import type { CapitalPlanId, WithdrawalRequest } from '@/core/types';

const PLAN_RETURN_PCT: Record<string, number> = {
  conservador: 25,
  equilibrado: 20,
  agressivo: 15,
};

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

function SimulationBanner() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  return (
    <View style={styles.simBanner}>
      <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
      <AppText variant="small" style={{ color: colors.textMuted, flex: 1 }}>
        {t('capital.simulationDisclaimer')}
      </AppText>
    </View>
  );
}

export default function BancaScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const router = useRouter();
  const { canAccessBanca, loading: subLoading } = useSubscription();
  const { config, loading: bancaLoading } = useBanca();
  const { account, reports, metaPercent, loading: accountLoading, error: accountError } = useCapitalAccount();
  const { contract, loading: contractLoading, error: contractError } = useCapitalContract();
  const { requests: withdrawalRequests, loading: withdrawalsLoading, error: withdrawalsError } = useWithdrawalRequests();

  // Regra absoluta: um cliente premium NUNCA vê bloqueio. Enquanto o plano
  // não está confirmado, mostramos loading — nunca a restrição.
  if (!subLoading && !canAccessBanca) {
    return (
      <Screen>
        <PremiumLock label={t('capital.lockTitle')} description={t('capital.lockDesc')} />
      </Screen>
    );
  }

  const dataLoading = bancaLoading || accountLoading || contractLoading || withdrawalsLoading;
  if (subLoading || dataLoading) {
    return <Screen><AppText variant="muted">{t('capital.loading')}</AppText></Screen>;
  }

  const dataError = accountError ?? contractError ?? withdrawalsError ?? null;
  if (dataError) {
    return (
      <Screen>
        <SectionTitle>{t('capital.title')}</SectionTitle>
        <EmptyState title={t('common.error')} subtitle={t('capital.loadError')} />
      </Screen>
    );
  }

  // Servidor é a fonte da verdade; config local é fallback (offline/ainda sem conta).
  const capital = account?.capital ?? config.capital;
  const current = account?.achieved ?? config.achieved;
  const cur = account?.currency ?? config.currency ?? 'usd';
  const totalWithdrawn = account?.total_withdrawn ?? config.totalWithdrawn;
  const latestReport = reports[0] ?? null;
  const latestDailyGain = latestReport ? dailyGain(latestReport) : 0;

  const activeContract = contract && contract.status === 'active' ? contract : null;
  const contractFinished = !!contract && !(contract.status === 'active' && !contractEnded(contract.end_date));

  // reports chegam latest-first do hook; o gráfico quer ordem cronológica.
  const chartReports = [...reports].slice(0, 7).reverse();
  const maxBalance = Math.max(...chartReports.map((r) => r.ending_balance), 1);
  const avgDailyGain = chartReports.length
    ? chartReports.reduce((s, r) => s + dailyGain(r), 0) / chartReports.length
    : 0;

  const p = profit(current, capital);
  const pPct = profitPct(current, capital);
  const isProfit = p >= 0;
  const planId = account?.plan ?? contract?.plan_id ?? config.planId;
  const targetPct = PLAN_RETURN_PCT[planId] ?? metaPercent;
  const targetValue = capital * (targetPct / 100);
  const progress = progressPct(current, capital, targetPct);
  const goalReached = targetValue > 0 && progress >= 100 && (!contract || !contractEnded(contract.end_date));
  const managementActive = contract ? (contract.status === 'active' && !contractEnded(contract.end_date) && !goalReached) : (!contract && (Boolean(account) || capital > 0 || current > 0) && !goalReached);

  // Depósitos de gestão aprovados na moeda da conta (fonte da verdade do server)
  // Estado binário: gestão ativa (conta publicada ou capital registado)
  const hasManagement = Boolean(account) || capital > 0 || current > 0;

  const liabilityMeta = (status: WithdrawalRequest['status']): { label: string; color: string } => {
    switch (status) {
      case 'approved':
        return { label: t('capital.liabilityApproved'), color: colors.accent };
      case 'rejected':
        return { label: t('capital.liabilityRejected'), color: colors.destructive };
      case 'paid':
        return { label: t('capital.liabilityPaid'), color: colors.success };
      default:
        return { label: t('capital.liabilityPending'), color: colors.warning };
    }
  };

  if (!hasManagement) {
    return (
      <Screen>
        <SectionTitle>{t('capital.title')}</SectionTitle>
        <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
          {t('capital.subtitle')}
        </AppText>
        <SimulationBanner />

        <GradientCard colors={[`${colors.accent}26`, `${colors.primary}12`]} style={styles.hero}>
          <AppText variant="small" style={[styles.heroEyebrow, { color: colors.accent }]}>
            {t('capital.inactiveEyebrow')}
          </AppText>
          <AppText variant="mono" style={styles.heroValue}>+{targetPct}%</AppText>
          <AppText variant="small" style={{ color: colors.textBody }}>
            {t('capital.inactiveHeroDesc')}
          </AppText>
          <View style={styles.heroFooter}>
            <AppText variant="small" style={{ color: colors.textMuted }}>
              {t('capital.minDeposit')}: {formatMinDepositCore(cur)}
            </AppText>
            <StatusPill label={t('capital.inactiveBadge')} color={colors.warning} />
          </View>
        </GradientCard>

        <Card style={styles.card}>
          <View style={styles.cardHeader}><AppText variant="label">{t('capital.howItWorks')}</AppText></View>
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
        />
      </Screen>
    );
  }

  if (contractFinished) {
    return (
      <Screen>
        <SectionTitle>{t('capital.title')}</SectionTitle>
        <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
          {t('capital.subtitle')}
        </AppText>
        <SimulationBanner />
        <AppText variant="h2" style={{ marginBottom: Spacing.sm }}>{t('capital.endedTitle')}</AppText>
        <ManagementEnded
          finalValue={current}
          capital={capital}
          currency={cur}
          profitValue={p}
          defaultPlanId={planId as CapitalPlanId}
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
      <SimulationBanner />

      <GradientCard colors={[colors.primaryDim, 'rgba(22,164,58,0.15)']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="small" style={styles.heroEyebrow}>{t('capital.currentBalance')}</AppText>
            <View style={styles.managedRow}>
              <Ionicons
                name={(goalReached || managementActive) ? 'shield-checkmark' : 'shield-outline'}
                size={13}
                color={(goalReached || managementActive) ? colors.success : colors.warning}
              />
              <AppText variant="small" style={{ color: (goalReached || managementActive) ? colors.success : colors.warning }}>
                {goalReached ? t('capital.goalReachedTitle') : managementActive ? t('capital.managedActive') : t('capital.managedEnded')}
              </AppText>
            </View>
          </View>
          <StatusPill
            label={goalReached ? t('capital.goalReachedTitle') : managementActive ? t('capital.active') : t('capital.contractEnded')}
            color={(goalReached || managementActive) ? colors.success : colors.warning}
          />
        </View>
        <AppText variant="mono" style={[styles.heroValue, { color: isProfit ? colors.text : colors.destructive }]}>
          {formatBancaMoney(current, cur)}
        </AppText>
        <View style={styles.heroFooter}>
          <AppText variant="small" style={{ color: colors.textMuted }}>
            {t('capital.deposited')}{formatBancaMoney(capital, cur)}
          </AppText>
          <AppText variant="small" style={{ color: isProfit ? colors.success : colors.destructive }}>
            {isProfit ? '+' : ''}{formatBancaMoney(p, cur)} ({pPct > 0 ? '+' : ''}{pPct.toFixed(1)}%)
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
              <Badge color={latestReport.profit >= 0 ? colors.success : colors.destructive}
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
            <View style={styles.reportRow}>
              <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.dailyGain')}</AppText>
              <AppText variant="label" style={{ color: latestDailyGain >= 0 ? colors.success : colors.destructive }}>
                {`${latestDailyGain >= 0 ? '+' : ''}${formatBancaMoney(latestDailyGain, cur)}`}
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

      {activeContract ? <ContractCard contract={activeContract} goalReached={goalReached} /> : null}

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Ionicons name="wallet" size={18} color={colors.text} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.invested')}</AppText>
          <AppText variant="label">{formatBancaMoney(capital, cur)}</AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="trending-up" size={18} color={colors.success} />
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.profit')}</AppText>
          <AppText variant="label" style={{ color: isProfit ? colors.success : colors.destructive }}>
            {isProfit ? '+' : ''}{formatBancaMoney(p, cur)}
          </AppText>
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
          <AppText variant="small" style={{ color: colors.textMuted }}>{Math.round(progress)}%</AppText>
        </View>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <AppText variant="small" style={{ color: colors.textMuted }}>
            {p >= 0 ? '+' : ''}{formatBancaMoney(p, cur)}
          </AppText>
          <AppText variant="small" style={{ color: colors.accent }}>
            {t('capital.targetValue', { value: formatBancaMoney(targetValue, cur) })}
          </AppText>
        </View>
        <View style={styles.progressLabels}>
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.progressMissing')}</AppText>
          <AppText variant="label" style={{ color: colors.warning }}>{Math.round(100 - progress)}%</AppText>
        </View>
      </Card>

      {chartReports.length > 0 ? (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant="label">{t('capital.chartTitle')}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }}>
              {t('capital.dailyGain')}: {formatBancaMoney(avgDailyGain, cur)}
            </AppText>
          </View>
          <View style={styles.chart}>
            {chartReports.map((r) => (
              <View key={r.id} style={styles.chartCol}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: Math.max(4, (r.ending_balance / maxBalance) * 72),
                      backgroundColor: r.profit >= 0 ? colors.success : colors.destructive,
                    },
                  ]}
                />
                <AppText variant="small" style={styles.chartLabel}>
                  {formatShortDate(r.period_end)}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <CapitalSimulatorCard capital={capital} currency={cur} strategy={config.planId} />

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.liabilitiesTitle')}</AppText>
        </View>
        {withdrawalRequests.length === 0 ? (
          <AppText variant="muted">{t('capital.liabilitiesEmpty')}</AppText>
        ) : (
          withdrawalRequests.slice(0, 10).map((r) => {
            const method = PAYMENT_METHODS.find((m) => m.id === r.method);
            const meta = liabilityMeta(r.status);
            return (
              <View key={r.id} style={styles.liabilityRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label">{method?.label ?? r.method}</AppText>
                  <AppText variant="small" style={{ color: colors.textMuted }}>
                    {formatBancaMoney(r.amount, r.currency as 'usd' | 'aoa')} · {formatShortDate(r.created_at)}
                  </AppText>
                </View>
                <StatusPill label={meta.label} color={meta.color} />
              </View>
            );
          })
        )}
      </Card>

        <GrowthPlanSection
          capital={capital}
          currency={cur}
          achieved={current}
          profitValue={p}
          returnPct={targetPct}
          goalReached={goalReached}
        />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hero: { gap: Spacing.sm, marginBottom: Spacing.md },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    managedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    heroEyebrow: { color: c.textMuted, fontWeight: '700', letterSpacing: 1 },
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
    simBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: `${c.accent}12`,
      borderColor: `${c.accent}40`,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
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
    chart: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, marginTop: Spacing.xs },
    chartCol: { flex: 1, alignItems: 'center', gap: Spacing.xs },
    chartBar: { width: '100%', minHeight: 4, borderRadius: 4 },
    chartLabel: { fontSize: 9, color: c.textMuted },
    liabilityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  });