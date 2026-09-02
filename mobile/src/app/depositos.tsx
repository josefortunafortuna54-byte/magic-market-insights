import { useEffect, useMemo, useState } from 'react';
import { Alert, Animated, AppState, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppInput, AppText, Badge, Card, Chip, EmptyState, Screen, SectionTitle } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PaymentModal } from '@/components/PaymentModal';
import { useMovements, type WalletMovement } from '@/hooks/useMovements';
import { useBanca } from '@/hooks/useBanca';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { uploadReceipt, type ReceiptFile } from '@/lib/payments';
import { clearReceiptInbox, getReceiptInbox } from '@/lib/receiptInbox';
import { saveReceipt, submitWithdrawalRequest } from '@/lib/adminApi';
import { notifyPlanRequestSubmitted } from '@/lib/planRequests';
import { savePendingPlanPayment } from '@/lib/referral';
import { ReceiptSuccessModal } from '@/components/ReceiptSuccessModal';
import {
  PAYMENT_METHODS,
  PLANS,
  PLAN_PRICES,
  PRICES,
  planLabel,
  type Currency,
  type PaymentMethod,
  type PlanId,
} from '@/lib/plans';
import { formatBancaMoney, formatMoney, formatShortDate } from '@/core/format';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

type TabId = 'deposit' | 'withdraw';

export default function DepositosScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ plan?: string; currency?: string; amount?: string }>();
  const { config: banca } = useBanca();
  const { user } = useAuth();
  const { movements, loading, addMovement, deleteMovement } = useMovements();

  const [activeTab, setActiveTab] = useState<TabId>('deposit');
  const [tabAnim] = useState(() => new Animated.Value(0));
  const [plan, setPlan] = useState<Exclude<PlanId, 'free'>>(
    PLANS.some((p) => p.id === params.plan) ? (params.plan as Exclude<PlanId, 'free'>) : 'basic',
  );
  const [currency, setCurrency] = useState<Currency>(params.currency === 'aoa' ? 'aoa' : 'usd');

  const [syncedParams, setSyncedParams] = useState<{ plan?: string; currency?: string; amount?: string }>({
    plan: params.plan,
    currency: params.currency,
    amount: params.amount,
  });
  if (
    syncedParams.plan !== params.plan ||
    syncedParams.currency !== params.currency ||
    syncedParams.amount !== params.amount
  ) {
    setSyncedParams({ plan: params.plan, currency: params.currency, amount: params.amount });
    if (params.plan && PLANS.some((p) => p.id === params.plan)) {
      setPlan(params.plan as Exclude<PlanId, 'free'>);
    }
    if (params.currency === 'aoa' || params.currency === 'usd') {
      setCurrency(params.currency as Currency);
    }
  }

  // Valor vindo do simulador de retorno da banca (primeiro depósito):
  // o ecrã fica bloqueado num único depósito de capital com esse montante.
  const parsedCustomAmount = params.amount
    ? parseFloat(String(params.amount).replace(',', '.'))
    : NaN;
  const customAmount = isFinite(parsedCustomAmount) && parsedCustomAmount > 0 ? parsedCustomAmount : null;
  const isCapitalDeposit = customAmount !== null;
  const [depositModal, setDepositModal] = useState<{ method?: PaymentMethod; initialProof?: ReceiptFile | null } | null>(null);
  const [sending, setSending] = useState(false);
  const [showReceiptSuccess, setShowReceiptSuccess] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');

  useEffect(() => {
    const checkInbox = async () => {
      const inbox = await getReceiptInbox();
      if (!inbox) return;
      await clearReceiptInbox();
      setDepositModal((prev) => prev ?? { initialProof: inbox });
    };
    void checkInbox();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkInbox();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    tabAnim.setValue(0);
    Animated.timing(tabAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabAnim]);

  const availableMethods = useMemo(
    () => PAYMENT_METHODS.filter((m) => (currency === 'usd' ? m.usd : m.aoa)),
    [currency],
  );

  const price = PRICES[currency][plan];
  const planPrice = PLAN_PRICES[currency][plan];
  const currencySymbol = currency === 'usd' ? 'USD' : 'AOA';
  const selectedPlan = PLANS.find((p) => p.id === plan);

  const formatMovementAmount = (amount: number, curr: Currency) =>
    curr === 'usd' ? `$${formatMoney(amount)}` : `${formatMoney(amount)} Kz`;

  // Regra: apenas UM pedido de depósito pendente por utilizador.
  const hasPendingDepositRequest = async (): Promise<boolean> => {
    if (user?.id) {
      const { count, error } = await supabase
        .from('payment_receipts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');
      if (!error && (count ?? 0) > 0) return true;
    }
    return movements.some((m) => m.type === 'deposit' && m.status === 'pendente');
  };

  const alertPendingDeposit = () => {
    Alert.alert(t('depositos.pendingDepositTitle'), t('depositos.pendingDepositMsg'));
  };

  const openDepositModal = async () => {
    if (await hasPendingDepositRequest()) {
      alertPendingDeposit();
      return;
    }
    setDepositModal({});
  };

  const confirmDeposit = async (proof: ReceiptFile | null, retries = 2) => {
    if (!depositModal?.method || !proof) return;
    if (!user) {
      Alert.alert(t('planos.connectionError'));
      return;
    }
    if (await hasPendingDepositRequest()) {
      alertPendingDeposit();
      setDepositModal(null);
      return;
    }
    setSending(true);
    const depositAmount = customAmount ?? planPrice;
    let result: { url: string | null; error?: string } = { url: null };
    for (let attempt = 0; attempt <= retries; attempt++) {
      result = await uploadReceipt(user.id, proof);
      if (result.url) break;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500));
    }
    if (!result.url) {
      setSending(false);
      Alert.alert(
        t('planos.connectionError'),
        result.error || t('planos.retryMessage') || 'Erro ao enviar comprovativo.',
        [
          { text: t('planos.cancel'), style: 'cancel' },
          { text: t('planos.tryAgain') || 'Tentar novamente', onPress: () => confirmDeposit(proof, retries) },
        ],
      );
      return;
    }
    void addMovement({
      type: 'deposit',
      method: depositModal.method,
      amount: depositAmount,
      currency,
      plan: isCapitalDeposit ? 'capital' : plan,
      status: 'pendente',
    });
    // Save receipt server-side for admin review
    if (user) {
      try {
        await saveReceipt({
          user_id: user.id,
          user_email: user.email ?? '',
          proof_url: result.url,
          plan: isCapitalDeposit ? 'capital' : plan,
          method: depositModal.method,
          amount: depositAmount,
          currency,
        });
        // Regista o valor pago — ao ativar o premium passa a ser o saldo da
        // gestão de capital (para utilizadores vindos de link de afiliado).
        // Depósitos de capital não são ativação de plano.
        if (!isCapitalDeposit) {
          void savePendingPlanPayment({ plan, amount: depositAmount, currency });
        }
      } catch (err: any) {
        console.warn('[confirmDeposit] saveReceipt failed:', err?.message);
        Alert.alert(
          t('planos.connectionError'),
          t('depositos.receiptSaveError') || 'Comprovativo enviado mas não foi possível registar no servidor. Contacte o suporte.',
        );
      }
    }
    setSending(false);
    setDepositModal(null);
    setShowReceiptSuccess(true);
    void notifyPlanRequestSubmitted(
      isCapitalDeposit ? t('depositos.capitalDepositTitle') : planLabel(plan),
      isCapitalDeposit ? formatMovementAmount(depositAmount, currency) : price,
    );
  };

  const submitWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount.replace(',', '.'));
    if (!withdrawMethod || !isFinite(amount) || amount <= 0 || !withdrawDetails.trim()) {
      Alert.alert(t('depositos.invalidWithdraw'));
      return;
    }
    // Save server-side
    try {
      await submitWithdrawalRequest({
        method: withdrawMethod,
        amount,
        currency,
        details: withdrawDetails.trim(),
      });
    } catch (err: any) {
      console.warn('[submitWithdrawal] server save failed:', err?.message);
    }
    // Also save locally for instant UI
    void addMovement({
      type: 'withdrawal',
      method: withdrawMethod,
      amount,
      currency,
      status: 'pendente',
      notes: withdrawDetails.trim(),
    });
    setWithdrawAmount('');
    setWithdrawDetails('');
    setWithdrawMethod(null);
    Alert.alert(t('depositos.confirmWithdrawOk'), t('depositos.confirmWithdrawMsg'), [{ text: 'OK' }]);
  };

  const currencySegment = (
    <View style={styles.segment}>
      {(['usd', 'aoa'] as const).map((c) => {
        const active = currency === c;
        return (
          <Pressable
            key={c}
            onPress={() => setCurrency(c)}
            style={styles.segmentBtn}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            {active ? <View style={styles.segmentPill} /> : null}
            <AppText
              variant="small"
              style={{ color: active ? colors.bg : colors.textMuted, fontWeight: '700' }}>
              {c === 'usd' ? t('planos.usd') : t('planos.aoa')}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  const renderMovement = (m: WalletMovement, index: number) => {
    const isDeposit = m.type === 'deposit';
    const method = PAYMENT_METHODS.find((pm) => pm.id === m.method);
    const statusColor = m.status === 'concluido' ? colors.success : m.status === 'recusado' ? colors.destructive : colors.warning;
    const isPending = m.status === 'pendente';

    const handleDelete = () => {
      Alert.alert(t('depositos.deleteMovementTitle'), t('depositos.deleteMovementMsg'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('depositos.deleteMovement'), style: 'destructive', onPress: () => deleteMovement(m.id) },
      ]);
    };

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
          <View style={styles.movementStatusRow}>
            <Badge color={statusColor} bg={`${statusColor}20`}>
              {m.status === 'concluido' ? t('depositos.statusConcluido') : t('depositos.statusPendente')}
            </Badge>
            {isPending ? (
              <Pressable onPress={handleDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={14} color={colors.destructive} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const tabs: { id: TabId; icon: 'arrow-down-circle-outline' | 'arrow-up-circle-outline'; label: string }[] = [
    { id: 'deposit', icon: 'arrow-down-circle-outline', label: t('depositos.tabDeposit') },
    { id: 'withdraw', icon: 'arrow-up-circle-outline', label: t('depositos.tabWithdraw') },
  ];

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
            <AppText style={styles.heroUsdText}>{currencySymbol}</AppText>
          </View>
        </View>
        <AppText style={styles.heroValue}>{formatBancaMoney(banca.achieved, banca.currency ?? 'usd')}</AppText>
        <View style={styles.heroFooter}>
          <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.65)" />
          <AppText style={styles.heroSub}>{t('depositos.balanceSub')}</AppText>
        </View>
      </GradientCard>

      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}>
              {active ? <View style={styles.tabPill} /> : null}
              <Ionicons name={tab.icon} size={16} color={active ? colors.bg : colors.textMuted} />
              <AppText
                variant="small"
                style={{ color: active ? colors.bg : colors.textMuted, fontWeight: '700' }}>
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.tabBody,
          {
            opacity: tabAnim,
            transform: [
              { translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          },
        ]}>
        {activeTab === 'deposit' ? (
          <>
            {!isCapitalDeposit ? currencySegment : null}
            {!isCapitalDeposit ? (
              <View style={styles.planChips}>
                {PLANS.map((p) => (
                  <Chip key={p.id} label={planLabel(p.id)} active={plan === p.id} onPress={() => setPlan(p.id)} />
                ))}
              </View>
            ) : null}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.planIconWrap}>
                  <Ionicons
                    name={isCapitalDeposit ? 'trending-up' : selectedPlan?.icon ?? 'flash'}
                    size={20}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.summaryMeta}>
                  <AppText variant="label">
                    {isCapitalDeposit ? t('depositos.capitalDepositTitle') : planLabel(plan)}
                  </AppText>
                  <AppText variant="small" style={{ color: colors.textMuted }}>
                    {isCapitalDeposit ? t('depositos.capitalDepositSubtitle') : t('depositos.amount')}
                  </AppText>
                </View>
                <AppText style={styles.summaryPrice}>
                  {isCapitalDeposit ? formatBancaMoney(customAmount, currency) : price}
                </AppText>
              </View>
              <AppButton
                title={t('depositos.depositCta', {
                  amount: isCapitalDeposit ? formatBancaMoney(customAmount, currency) : price,
                })}
                variant={isCapitalDeposit || plan === 'pro' ? 'gold' : 'primary'}
                style={styles.cta}
                onPress={openDepositModal}
              />
              <View style={styles.secureRow}>
                <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                <AppText variant="small" style={{ color: colors.textMuted }}>
                  {t('depositos.secureNote')}
                </AppText>
              </View>
            </Card>
          </>
        ) : (
          <>
            {currencySegment}
            <Card style={styles.withdrawCard}>
              <AppText variant="muted">{t('depositos.withdrawSubtitle')}</AppText>

              <View style={styles.availableRow}>
                <AppText variant="label" style={{ color: colors.textMuted }}>
                  {t('depositos.withdrawAvailable')}
                </AppText>
                <AppText variant="label" style={{ color: colors.success }}>
                  {formatBancaMoney(banca.achieved, banca.currency ?? 'usd')}
                </AppText>
              </View>

              <AppText variant="label" style={styles.fieldLabel}>{t('depositos.withdrawMethod')}</AppText>
              <View style={styles.methodChips}>
                {availableMethods.map((m) => {
                  const active = withdrawMethod === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setWithdrawMethod(m.id)}
                      style={[styles.methodBtn, active && styles.methodBtnActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}>
                      <Ionicons name={m.icon} size={16} color={active ? colors.bg : m.color} />
                      <AppText
                        variant="small"
                        style={{ color: active ? colors.bg : colors.text, fontWeight: '600' }}>
                        {m.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <AppInput
                label={t('depositos.withdrawAmount', { currency: currencySymbol })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                icon={<Ionicons name="cash-outline" size={18} color={colors.textMuted} />}
              />
              <AppInput
                label={t('depositos.withdrawDetails')}
                placeholder={withdrawMethod ? PAYMENT_METHODS.find((m) => m.id === withdrawMethod)?.getDetails(t) : undefined}
                value={withdrawDetails}
                onChangeText={setWithdrawDetails}
                multiline
                numberOfLines={2}
                icon={<Ionicons name="card-outline" size={18} color={colors.textMuted} />}
              />
              <AppButton
                title={t('depositos.withdrawCta')}
                variant="secondary"
                style={styles.cta}
                onPress={submitWithdrawal}
              />
            </Card>
          </>
        )}
      </Animated.View>

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

      {depositModal ? (
        <PaymentModal
          plan={plan}
          currency={currency}
          price={price}
          onClose={() => setDepositModal(null)}
          onConfirm={confirmDeposit}
          method={depositModal.method}
          onMethodSelect={(m) => setDepositModal({ method: m, initialProof: depositModal.initialProof })}
          availableMethods={availableMethods}
          initialProof={depositModal.initialProof ?? null}
          busy={sending}
        />
      ) : null}

      <ReceiptSuccessModal
        visible={showReceiptSuccess}
        onDone={() => setShowReceiptSuccess(false)}
      />
    </Screen>
  );
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: c.surfaceElevated,
    borderRadius: 999,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabPill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.accent,
    borderRadius: 999,
    shadowColor: c.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tabBody: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: c.surfaceElevated,
    borderRadius: 999,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 999,
  },
  segmentPill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.accent,
    borderRadius: 999,
    shadowColor: c.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  planChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryCard: {
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  planIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: `${c.accent}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMeta: {
    flex: 1,
    gap: 2,
  },
  summaryPrice: {
    color: c.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cta: {
    minHeight: 54,
    borderRadius: Radius.lg,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  withdrawCard: {
    gap: Spacing.md,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceElevated,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  fieldLabel: {
    color: c.textMuted,
  },
  methodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceElevated,
  },
  methodBtnActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
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
  movementStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  deleteBtn: {
    padding: 4,
  },
});
