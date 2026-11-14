import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge, Card, EmptyState, Screen, SectionTitle } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { useMovements, type WalletMovement } from '@/hooks/useMovements';
import { useBanca } from '@/hooks/useBanca';
import { useCapitalAccount } from '@/hooks/useCapitalAccount';
import { formatBancaMoney, formatShortDate } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { PAYMENT_METHODS, planLabel, type PlanId } from '@/lib/plans';
import { webDepositUrl } from '@/lib/env';

export default function DepositosScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const { config: banca } = useBanca();
  const { account: capitalAccount } = useCapitalAccount();
  const { movements, loading } = useMovements();

  const heroCurrency = capitalAccount?.currency ?? banca.currency ?? 'usd';
  const heroAchieved = capitalAccount?.achieved ?? banca.achieved;

  const formatMovementAmount = (amount: number, curr: 'usd' | 'aoa') =>
    curr === 'usd' ? `$${formatMoney(amount)}` : `${formatMoney(amount)} Kz`;

  const renderMovement = (m: WalletMovement, index: number) => {
    const isDeposit = m.type === 'deposit';
    const method = PAYMENT_METHODS.find((pm) => pm.id === m.method);
    const statusColor = m.status === 'concluido' ? colors.success : m.status === 'recusado' ? colors.destructive : colors.warning;

    return (
      <View key={m.id} style={[styles.movementRow, index > 0 && styles.movementDivider]}>
        <View style={[styles.movementIcon, { backgroundColor: `${isDeposit ? colors.success : colors.accent}14` }]}>
          <Ionicons
            name={isDeposit ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={22}
            color={isDeposit ? colors.success : colors.accent}
          />
        </View>
        <View style={styles.movementInfo}>
          <AppText variant="label">
            {isDeposit
              ? m.plan === 'capital'
                ? t('depositos.movementCapital')
                : t('depositos.movementDeposit', { plan: planLabel(m.plan as Exclude<PlanId, 'free'>) })
              : t('depositos.movementWithdraw')}
          </AppText>
          <AppText variant="small" style={{ color: colors.textMuted }}>
            {method?.label} · {formatShortDate(m.createdAt)}
          </AppText>
        </View>
        <View style={styles.movementRight}>
          <AppText
            variant="label"
            style={{ color: isDeposit ? colors.success : colors.accent, fontWeight: '800' }}>
            {`${isDeposit ? '+' : '-'} ${formatMovementAmount(m.amount, m.currency)}`}
          </AppText>
          <Badge color={statusColor} bg={`${statusColor}20`}>
            {m.status === 'concluido' ? t('depositos.statusConcluido') : t('depositos.statusPendente')}
          </Badge>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <GradientCard
        colors={[`${colors.primary}DD`, '#0B5C2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View pointerEvents="none" style={styles.heroCircleA} />
        <View pointerEvents="none" style={styles.heroCircleB} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
            </View>
            <AppText style={styles.heroLabel}>{t('depositos.balance')}</AppText>
          </View>
          <View style={styles.heroUsdPill}>
            <AppText style={styles.heroUsdText}>{heroCurrency === 'usd' ? 'USD' : 'AOA'}</AppText>
          </View>
        </View>
        <AppText style={styles.heroValue}>{formatBancaMoney(heroAchieved, heroCurrency)}</AppText>
        <View style={styles.heroFooter}>
          <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.65)" />
          <AppText style={styles.heroSub}>{t('depositos.balanceSub')}</AppText>
        </View>
      </GradientCard>

      <Card style={styles.infoCard}>
        <View style={styles.infoHead}>
          <View style={[styles.infoIcon, { backgroundColor: `${colors.accent}18` }]}>
            <Ionicons name="globe-outline" size={20} color={colors.accent} />
          </View>
          <AppText variant="label" style={{ flex: 1 }}>{t('depositos.webTitle')}</AppText>
        </View>
        <AppText variant="muted">{t('depositos.webDesc')}</AppText>
        <AppButton
          title={t('depositos.webCta')}
          variant="secondary"
          icon={<Ionicons name="open-outline" size={18} color={colors.accent} />}
          onPress={() => Linking.openURL(webDepositUrl())}
        />
      </Card>

      <View style={styles.section}>
        <SectionTitle>{t('depositos.historySection')}</SectionTitle>
        {loading ? (
          <Card>
            <AppText variant="muted" style={{ textAlign: 'center' }}>{t('common.loading')}</AppText>
          </Card>
        ) : movements.length === 0 ? (
          <EmptyState title={t('depositos.empty')} />
        ) : (
          <Card style={styles.historyCard}>{movements.map(renderMovement)}</Card>
        )}
      </View>
    </Screen>
  );
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hero: {
      padding: Spacing.lg,
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
      borderColor: 'rgba(255,255,255,0.14)',
      shadowColor: c.primary,
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    heroCircleA: {
      position: 'absolute',
      top: -70,
      right: -40,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    heroCircleB: {
      position: 'absolute',
      bottom: -90,
      left: -30,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    heroBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroLabel: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
    },
    heroUsdPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    heroUsdText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    heroValue: {
      color: '#FFFFFF',
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -0.5,
      lineHeight: 42,
    },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    heroSub: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
    },
    infoCard: {
      marginBottom: Spacing.lg,
      gap: Spacing.md,
    },
    infoHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    infoIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: {
      marginBottom: Spacing.lg,
    },
    historyCard: {
      gap: 0,
    },
    movementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    movementDivider: {
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    movementIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    movementInfo: {
      flex: 1,
      gap: 2,
    },
    movementRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
  });
