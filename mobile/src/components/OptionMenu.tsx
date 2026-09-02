import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

export interface OptionMenuOption {
  label: string;
  value: string;
  locked?: boolean;
}

export function OptionMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: OptionMenuOption[];
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <AppText variant="small" style={styles.label}>{label}</AppText>
        <AppText variant="label" style={styles.value} numberOfLines={1}>
          {selected?.label}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <AppText variant="h2" style={styles.sheetTitle}>{label}</AppText>
          <View style={styles.options}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  disabled={opt.locked}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}>
                  <AppText
                    variant="label"
                    style={[styles.optionText, active && styles.optionTextActive]}>
                    {opt.locked ? `${t('components.ui.lockedPrefix')}${opt.label}` : opt.label}
                  </AppText>
                  {active ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  label: { color: c.textMuted, fontWeight: '700', letterSpacing: 1 },
  value: { flex: 1, textAlign: 'right', color: c.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderColor: c.border,
    borderWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + Spacing.lg,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.border,
  },
  sheetTitle: { textAlign: 'center' },
  options: { gap: Spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: {
    backgroundColor: c.accentDim,
    borderColor: `${c.accent}40`,
  },
  optionText: { color: c.textBody },
  optionTextActive: { color: c.accent, fontWeight: '800' },
});
