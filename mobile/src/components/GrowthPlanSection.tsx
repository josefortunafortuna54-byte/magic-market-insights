import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Badge, Card } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatBancaMoney } from '@/core/format';
import { useTranslation } from 'react-i18next';
import { useBanca } from '@/hooks/useBanca';

const STORAGE_KEY = 'growth_plan';

interface GrowthPlan {
  id: string;
  nameKey: 'planoCrescimento.conservative' | 'planoCrescimento.balanced' | 'planoCrescimento.aggressive';
  descKey: 'planoCrescimento.conservativeDesc' | 'planoCrescimento.balancedDesc' | 'planoCrescimento.aggressiveDesc';
  returnPct: number;
  months: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const makePlans = (c: Palette): GrowthPlan[] => [
  { id: 'conservador', nameKey: 'planoCrescimento.conservative', descKey: 'planoCrescimento.conservativeDesc', returnPct: 25, months: 3, icon: 'leaf', color: c.success },
  { id: 'equilibrado', nameKey: 'planoCrescimento.balanced', descKey: 'planoCrescimento.balancedDesc', returnPct: 20, months: 2, icon: 'analytics', color: c.accent },
  { id: 'agressivo', nameKey: 'planoCrescimento.aggressive', descKey: 'planoCrescimento.aggressiveDesc', returnPct: 15, months: 1, icon: 'rocket', color: c.destructive },
];

export function GrowthPlanSection({ capital, currency = 'usd' }: { capital: number; currency?: 'usd' | 'aoa' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const plans = makePlans(colors);
  const { config, save } = useBanca();
  const [selectedId, setSelectedId] = useState(config.planId);
  const [activated, setActivated] = useState(false);
  const bancaConfigRef = useRef(config);
  const activatedRef = useRef(activated);
  useEffect(() => {
    bancaConfigRef.current = config;
  }, [config]);
  useEffect(() => {
    activatedRef.current = activated;
  }, [activated]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.planId) setSelectedId(parsed.planId);
        if (parsed.activated) setActivated(true);
      } catch {
        // ignore
      }
    });
  }, []);

  const selectPlan = async (planId: string) => {
    setSelectedId(planId);
    // A estratégia escolhida passa a ser a estratégia da banca
    // (simulador de retorno passa a refletir "média" ou "arriscada").
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ planId, capital: bancaConfigRef.current.capital, activated: activatedRef.current }),
    );
    try {
      await save({ ...bancaConfigRef.current, planId });
    } catch {
      // ignore
    }
  };

  const plan = plans.find((p) => p.id === selectedId) ?? plans[0];
  const projectedReturn = capital * (1 + plan.returnPct / 100);
  const profit = projectedReturn - capital;
  const periodLabel = plan.months === 1
    ? t('planoCrescimento.monthOne', { count: plan.months })
    : t('planoCrescimento.months', { count: plan.months });

  const activate = async () => {
    setActivated(true);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ planId: selectedId, capital, activated: true }),
    );
    try {
      await save({ ...bancaConfigRef.current, planId: selectedId });
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AppText variant="h2">{t('planoCrescimento.title')}</AppText>
        {activated ? (
          <Badge color={colors.success} bg={`${colors.success}20`}>{t('planoCrescimento.planActive')}</Badge>
        ) : null}
      </View>
      <AppText variant="muted" style={styles.selectHint}>{t('planoCrescimento.select')}</AppText>

      <View style={styles.plans}>
        {plans.map((p) => {
          const selected = p.id === selectedId;
          return (
            <Pressable
              key={p.id}
              onPress={() => selectPlan(p.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}>
              <Card style={[styles.planCard, selected && styles.planSelected]}>
                <View style={styles.planRow}>
                  <View style={[styles.planIcon, { backgroundColor: `${p.color}1A` }]}>
                    <Ionicons name={p.icon} size={18} color={p.color} />
                  </View>
                  <View style={styles.planText}>
                    <AppText variant="label">{t(p.nameKey)}</AppText>
                    <AppText variant="small" style={{ color: colors.textMuted }}>{t(p.descKey)}</AppText>
                  </View>
                  <Badge color={p.color} bg={`${p.color}1A`}>+{p.returnPct}%</Badge>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? colors.success : colors.textFaint}
                  />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.projection}>
        <AppText variant="label" style={styles.projTitle}>{t('planoCrescimento.projection')}</AppText>
        <View style={styles.projRow}>
          <AppText style={{ color: colors.textBody }}>{t('planoCrescimento.investment')}</AppText>
          <AppText variant="label">{formatBancaMoney(capital, currency)}</AppText>
        </View>
        <View style={styles.projRow}>
          <AppText style={{ color: colors.textBody }}>{t('planoCrescimento.estimatedReturn')}</AppText>
          <AppText variant="label" style={{ color: colors.success }}>{formatBancaMoney(projectedReturn, currency)}</AppText>
        </View>
        <View style={styles.projRow}>
          <AppText style={{ color: colors.textBody }}>{t('planoCrescimento.period')}</AppText>
          <AppText variant="label">{periodLabel}</AppText>
        </View>
        <View style={styles.profitBadge}>
          <AppText variant="small" style={{ color: colors.success, fontWeight: '700' }}>
            {t('planoCrescimento.estimatedProfit', { value: formatBancaMoney(profit, currency) })}
          </AppText>
        </View>
      </Card>

      {activated ? (
        <AppButton title={t('planoCrescimento.planActive')} variant="secondary" disabled />
      ) : (
        <AppButton title={t('planoCrescimento.activate')} variant="primary" onPress={activate} />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { gap: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  selectHint: { marginBottom: Spacing.sm },
  plans: { gap: Spacing.sm, marginBottom: Spacing.md },
  planCard: { borderColor: c.border },
  planSelected: { borderColor: c.success, borderWidth: 2, backgroundColor: `${c.success}08` },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planText: { flex: 1, gap: 2 },
  projection: { marginBottom: Spacing.lg, gap: Spacing.sm },
  projTitle: { marginBottom: Spacing.xs },
  projRow: { flexDirection: 'row', justifyContent: 'space-between' },
  profitBadge: {
    backgroundColor: `${c.success}12`,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
});
