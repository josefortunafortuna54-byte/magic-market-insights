import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { ALL_PAIRS } from '@/core/gating';
import { calcPips, fetchPairPrice, pairDecimals } from '@/lib/pairPrice';
import type { TradeDirection, TradeResult } from '@/core/types';

const PAIRS = ALL_PAIRS.filter((p) => p !== 'BTC/USD');

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: {
    pair: string;
    direction: TradeDirection;
    entryPrice: number;
    exitPrice: number | null;
    lotSize: number;
    result: TradeResult;
    profitUsd: number;
    pips: number;
    notes: string;
    boomHourId: string | null;
    closedAt: string | null;
  }) => void;
}

export function AddTradeModal({ visible, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [pair, setPair] = useState(PAIRS[0]);
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [result, setResult] = useState<TradeResult>('WIN');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [profitUsd, setProfitUsd] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [notes, setNotes] = useState('');

  // Price suggestion + auto pips (overridden as soon as the user edits a field).
  const entryTouched = useRef(false);
  const exitTouched = useRef(false);
  const [pipsEdited, setPipsEdited] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    fetchPairPrice(pair)
      .then((price) => {
        if (!active || price == null) return;
        const s = price.toFixed(pairDecimals(pair));
        setSuggestion(s);
        if (!entryTouched.current) setEntryPrice(s);
        if (!exitTouched.current) setExitPrice(s);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [visible, pair]);

  // Auto pips derived during render; the user's manual value wins once edited.
  const entryNum = Number(entryPrice);
  const exitNum = Number(exitPrice);
  const autoPips =
    entryPrice && exitPrice && isFinite(entryNum) && isFinite(exitNum)
      ? String(calcPips(pair, direction, entryNum, exitNum))
      : '';
  const pipsValue = pipsEdited ?? autoPips;

  const reset = () => {
    setPair(PAIRS[0]);
    setDirection('BUY');
    setResult('WIN');
    setEntryPrice('');
    setExitPrice('');
    setProfitUsd('');
    setLotSize('');
    setNotes('');
    entryTouched.current = false;
    exitTouched.current = false;
    setPipsEdited(null);
    setSuggestion(null);
  };

  const handleSave = () => {
    const pnl = Number(profitUsd);
    if (!isFinite(pnl)) {
      Alert.alert(t('diario.invalidValue'), t('diario.invalidProfit'));
      return;
    }
    onSave({
      pair,
      direction,
      entryPrice: entryPrice ? Number(entryPrice) : 0,
      exitPrice: exitPrice ? Number(exitPrice) : null,
      lotSize: lotSize ? Number(lotSize) : 0.01,
      result,
      profitUsd: pnl,
      pips: pipsValue ? Number(pipsValue) : 0,
      notes,
      boomHourId: null,
      closedAt: new Date().toISOString(),
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding">
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <AppText variant="h2">{t('diario.addTrade')}</AppText>
            <Pressable onPress={() => { reset(); onClose(); }} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textFaint} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <AppText variant="label" style={styles.sectionLabel}>{t('diario.tradePair')}</AppText>
            <View style={styles.chips}>
              {PAIRS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPair(p)}
                  style={[styles.chip, pair === p && styles.chipActive]}>
                  <AppText variant="small" style={{ color: pair === p ? '#000' : colors.textMuted, fontWeight: '600' }}>
                    {p}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="label" style={styles.sectionLabel}>{t('diario.tradeDirection')}</AppText>
            <View style={styles.dirRow}>
              {(['BUY', 'SELL'] as const).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDirection(d)}
                  style={[styles.dirBtn, direction === d && (d === 'BUY' ? styles.dirBuy : styles.dirSell)]}>
                  <Ionicons name={d === 'BUY' ? 'arrow-up' : 'arrow-down'} size={16} color={direction === d ? '#FFF' : colors.textMuted} />
                  <AppText variant="small" style={{ color: direction === d ? '#FFF' : colors.textMuted, fontWeight: '700' }}>{d}</AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="label" style={styles.sectionLabel}>{t('diario.tradeResult')}</AppText>
            <View style={styles.resultRow}>
              {(['WIN', 'LOSS', 'BREAKEVEN'] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setResult(r)}
                  style={[styles.resultBtn, result === r && {
                    backgroundColor: r === 'WIN' ? colors.success : r === 'LOSS' ? colors.destructive : colors.textMuted,
                    borderColor: r === 'WIN' ? colors.success : r === 'LOSS' ? colors.destructive : colors.textMuted,
                  }]}>
                  <Ionicons name={r === 'WIN' ? 'trophy' : r === 'LOSS' ? 'close-circle' : 'remove-circle'} size={14} color={result === r ? '#FFF' : colors.textMuted} />
                  <AppText variant="small" style={{ color: result === r ? '#FFF' : colors.textMuted, fontWeight: '700' }}>{r}</AppText>
                </Pressable>
              ))}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradeEntry')}
                  value={entryPrice}
                  onChangeText={(v) => { entryTouched.current = true; setEntryPrice(v); }}
                  keyboardType="decimal-pad"
                  placeholder="0.00000"
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradeExit')}
                  value={exitPrice}
                  onChangeText={(v) => { exitTouched.current = true; setExitPrice(v); }}
                  keyboardType="decimal-pad"
                  placeholder="0.00000"
                />
              </View>
            </View>
            {suggestion ? (
              <AppText variant="small" style={styles.hintText}>
                {t('diario.currentPrice', { price: suggestion })}
              </AppText>
            ) : null}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradeProfit')}
                  value={profitUsd}
                  onChangeText={setProfitUsd}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradePips')}
                  value={pipsValue}
                  onChangeText={(v) => setPipsEdited(v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                <AppText variant="small" style={styles.hintText}>
                  {t('diario.pipsAuto')}
                </AppText>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradeLot')}
                  value={lotSize}
                  onChangeText={setLotSize}
                  keyboardType="decimal-pad"
                  placeholder="0.01"
                />
              </View>
              <View style={{ flex: 1 }} />
            </View>

            <AppInput
              label={t('diario.tradeNotes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              placeholder={t('diario.tradeNotesPlaceholder')}
            />
          </ScrollView>

          <View style={styles.actions}>
            <AppButton title={t('diario.cancel')} variant="ghost" onPress={() => { reset(); onClose(); }} />
            <AppButton title={t('diario.save')} variant="primary" onPress={handleSave} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.textFaint,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: { maxHeight: '75%' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  sectionLabel: { marginBottom: Spacing.sm, marginTop: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceElevated,
  },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  dirRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  dirBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  dirBuy: { backgroundColor: c.success, borderColor: c.success },
  dirSell: { backgroundColor: c.destructive, borderColor: c.destructive },
  row: { flexDirection: 'row', gap: Spacing.sm },
  hintText: { color: c.textFaint, marginTop: -Spacing.xs, marginBottom: Spacing.sm },
  resultRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  resultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});
