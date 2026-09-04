import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText, Badge, Card } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatBancaMoney } from '@/core/format';
import { useTranslation } from 'react-i18next';

// Retorno esperado por estratégia da banca:
// conservador (segura) · equilibrado (média) · agressivo (arriscada)
const STRATEGY_RETURN_PCT: Record<string, number> = {
  conservador: 25,
  equilibrado: 20,
  agressivo: 15,
};

const STRATEGY_NAME_KEY: Record<
  string,
  'planoCrescimento.conservative' | 'planoCrescimento.balanced' | 'planoCrescimento.aggressive'
> = {
  conservador: 'planoCrescimento.conservative',
  equilibrado: 'planoCrescimento.balanced',
  agressivo: 'planoCrescimento.aggressive',
};

export function CapitalSimulatorCard({
  capital,
  currency = 'usd',
  strategy = 'conservador',
  onDeposit,
}: {
  capital: number;
  currency?: 'usd' | 'aoa';
  strategy?: string;
  onDeposit?: (amount: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const returnPct = STRATEGY_RETURN_PCT[strategy] ?? 25;
  const strategyName = t(STRATEGY_NAME_KEY[strategy] ?? 'planoCrescimento.conservative');
  const [raw, setRaw] = useState(capital > 0 ? String(Math.round(capital)) : '');

  const amount = useMemo(() => {
    const parsed = parseFloat(raw.replace(',', '.'));
    return isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [raw]);

  const projected = amount * (1 + returnPct / 100);
  const profit = projected - amount;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="calculator-outline" size={15} color={colors.accent} />
          <AppText variant="label">{t('capital.simulatorTitle')}</AppText>
        </View>
        <Badge color={colors.success} bg={`${colors.success}20`}>+{returnPct}%</Badge>
      </View>
      <AppText variant="small" style={{ color: colors.textMuted }}>
        {t('capital.simulatorDesc')}
      </AppText>
      <View style={styles.strategyRow}>
        <Ionicons name="analytics-outline" size={13} color={colors.textMuted} />
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {t('capital.simulatorStrategy', { name: strategyName })}
        </AppText>
      </View>
      <AppInput
        label={t('capital.simulatorAmount', { currency: currency === 'usd' ? 'USD' : 'AOA' })}
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={raw}
        onChangeText={setRaw}
        icon={<Ionicons name="cash-outline" size={18} color={colors.textMuted} />}
      />
      <View style={styles.row}>
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {t('capital.simulatorInvested')}
        </AppText>
        <AppText variant="label">{formatBancaMoney(amount, currency)}</AppText>
      </View>
      <View style={styles.row}>
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {t('capital.simulatorProjected')}
        </AppText>
        <AppText variant="label" style={{ color: colors.accent }}>
          {formatBancaMoney(projected, currency)}
        </AppText>
      </View>
      <View style={styles.profitBox}>
        <AppText variant="small" style={{ color: colors.success, fontWeight: '700' }}>
          {t('capital.simulatorProfit', { value: formatBancaMoney(profit, currency) })}
        </AppText>
      </View>
      {onDeposit ? (
        <AppButton
          title={t('capital.simulatorDepositCta')}
          variant="gold"
          disabled={amount < 50}
          icon={<Ionicons name="arrow-forward-circle-outline" size={18} color="#1A1A2E" />}
          onPress={() => onDeposit(amount)}
        />
      ) : null}
    </Card>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  strategyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profitBox: {
    backgroundColor: `${c.success}12`,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
});
