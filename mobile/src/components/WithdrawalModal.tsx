import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMovements } from '@/hooks/useMovements';
import { PAYMENT_METHODS, type Currency, type PaymentMethod } from '@/lib/plans';
import { submitWithdrawalRequest } from '@/lib/adminApi';

interface WithdrawalModalProps {
  visible: boolean;
  available: number;
  currency: Currency;
  onClose: () => void;
}

export function WithdrawalModal({ visible, available, currency, onClose }: WithdrawalModalProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const { addMovement } = useMovements();

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const methods = PAYMENT_METHODS.filter((m) => m[currency]);
  const amountNum = Number(amount);
  const isAoa = currency === 'aoa';
  const valid = Boolean(method) && amountNum > 0 && amountNum <= available &&
    (!isAoa || details.trim().length > 0);

  const selectedMethod = method ? methods.find((m) => m.id === method) : null;

  const submit = async () => {
    if (!valid || busy || !method) return;
    setBusy(true);
    try {
      await submitWithdrawalRequest({
        method,
        amount: amountNum,
        currency,
        details: isAoa ? details.trim() : undefined,
      });
      addMovement({
        type: 'withdrawal',
        method,
        amount: amountNum,
        currency,
        status: 'pendente',
        notes: isAoa ? details.trim() : selectedMethod?.label,
      });
      setAmount('');
      setDetails('');
      setMethod(null);
      onClose();
    } catch {
      Alert.alert(t('capital.withdrawErrorTitle'), t('capital.withdrawErrorMsg'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <AppText variant="h2">{t('capital.withdrawalTitle')}</AppText>
            <Pressable onPress={onClose} hitSlop={8} disabled={busy}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <AppText variant="muted">
              {t('capital.withdrawableValue', { value: formatWithdrawable(available, currency) })}
            </AppText>

            {!method ? (
              <View style={styles.methodGrid}>
                {methods.map((m) => (
                  <Pressable key={m.id} onPress={() => setMethod(m.id)} style={[styles.methodCard, { borderColor: m.color, borderWidth: 2 }]}>
                    <View style={[styles.methodIcon, { backgroundColor: `${m.color}1A` }]}>
                      <Ionicons name={m.icon} size={24} color={m.color} />
                    </View>
                    <AppText variant="label" style={{ color: m.color }}>{m.label}</AppText>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.selectedRow}>
                  <View style={[styles.methodIcon, { backgroundColor: `${selectedMethod?.color}1A` }]}>
                    <Ionicons name={selectedMethod?.icon ?? 'card'} size={20} color={selectedMethod?.color} />
                  </View>
                  <View style={styles.selectedInfo}>
                    <AppText variant="label" style={{ color: selectedMethod?.color }}>{selectedMethod?.label}</AppText>
                    <AppText variant="small" style={{ color: colors.textMuted }}>{selectedMethod?.getDetails(t)}</AppText>
                  </View>
                  <Pressable onPress={() => setMethod(null)} disabled={busy}>
                    <AppText variant="small" style={{ color: colors.primary }}>{t('planos.change')}</AppText>
                  </Pressable>
                </View>

                <AppInput
                  label={t('capital.withdrawAmount')}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                />
                {isAoa ? (
                  <AppInput
                    label={t('capital.withdrawDetails')}
                    placeholder="NIF / IBAN"
                    value={details}
                    onChangeText={setDetails}
                  />
                ) : null}
                <AppText variant="small" style={{ color: colors.textMuted }}>
                  {selectedMethod?.copyValue}
                </AppText>
              </>
            )}
          </View>

          <View style={styles.actions}>
            <AppButton title={t('planos.cancel')} variant="ghost" onPress={onClose} disabled={busy} />
            <AppButton
              title={t('capital.requestWithdrawal')}
              variant="primary"
              onPress={submit}
              loading={busy}
              disabled={!valid}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatWithdrawable(n: number, currency: Currency): string {
  if (currency === 'aoa') return `${Math.round(n).toLocaleString('pt-PT')} Kz`;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.md },
    content: { backgroundColor: c.surface, borderRadius: 20, padding: Spacing.lg, gap: Spacing.md, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, paddingBottom: Spacing.md },
    body: { gap: Spacing.md },
    methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    methodCard: { flex: 1, minWidth: 100, maxWidth: 130, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: 16, backgroundColor: c.surface, padding: Spacing.md },
    methodIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    selectedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, backgroundColor: c.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    selectedInfo: { flex: 1, gap: 2 },
    actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  });