import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { Fonts, Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------- Screen ----------

export function Screen({
  children,
  scroll = true,
  style,
  refreshControl,
  safeTop = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: object;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  safeTop?: boolean;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const bg = <View style={[styles.screen, style]}>{children}</View>;
  const edges: Edge[] = safeTop ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom'];
  if (!scroll) return <SafeAreaView style={styles.safe} edges={edges}>{bg}</SafeAreaView>;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAwareScrollView
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {bg}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// ---------- Text ----------

type TextVariant = 'title' | 'h1' | 'h2' | 'label' | 'muted' | 'mono' | 'small' | 'body';

export function AppText({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: TextVariant }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const variants = makeVariantStyles(colors);
  return <Text style={[styles.text, variants[variant], style]} {...props} />;
}

// ---------- Card ----------

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- Button ----------

export type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
  icon?: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const palette = makeButtonVariants(colors)[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (pressed || isDisabled) && { opacity: isDisabled ? 0.5 : 0.85 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon}
          <AppText style={[styles.buttonText, { color: palette.text }]}>{title}</AppText>
        </>
      )}
    </Pressable>
  );
}

// ---------- Badge ----------

export function Badge({
  children,
  color,
  bg,
  style,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
  style?: object;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: color ?? colors.textMuted,
          backgroundColor: bg ?? `${color ?? colors.textMuted}20`,
        },
        style,
      ]}>
      <AppText variant="small" style={{ color: color ?? colors.textMuted, fontWeight: '700' }}>
        {children}
      </AppText>
    </View>
  );
}

// ---------- ConfidenceBar ----------

export function ConfidenceBar({ value }: { value: number }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const color = value >= 80 ? colors.success : value >= 60 ? colors.warning : colors.textMuted;
  return (
    <View style={styles.confRow}>
      <View style={styles.confTrack}>
        <View style={[styles.confFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
      </View>
      <AppText variant="small" style={[styles.confValue, { color }]}>
        {value}%
      </AppText>
    </View>
  );
}

// ---------- Chip ----------

export function Chip({
  label,
  active,
  onPress,
  locked,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  locked?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        locked && { opacity: 0.4 },
      ]}>
      <AppText
        variant="small"
        style={{ color: active ? '#1A1A2E' : colors.textMuted, fontWeight: '600' }}>
        {locked ? `${t('components.ui.lockedPrefix')}${label}` : label}
      </AppText>
    </Pressable>
  );
}

// ---------- Spinner / EmptyState / Section ----------

export function Spinner({ label }: { label?: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <AppText variant="muted" style={{ marginTop: Spacing.md }}>{label}</AppText> : null}
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.center, { paddingVertical: Spacing.xl * 2 }]}>
      <AppText variant="h2" style={{ textAlign: 'center' }}>{title}</AppText>
      {subtitle ? (
        <AppText variant="muted" style={{ textAlign: 'center', marginTop: Spacing.sm }}>{subtitle}</AppText>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.sectionRow}>
      <AppText variant="h2">{children}</AppText>
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: object }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={[styles.divider, style]} />;
}

// ---------- Input ----------

export function AppInput(
  props: TextInputProps & { label?: string; icon?: ReactNode; accessory?: ReactNode },
) {
  const { label, icon, accessory, style, ...rest } = props;
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.inputWrap}>
      {label ? (
        <AppText variant="label" style={{ marginBottom: Spacing.xs }}>{label}</AppText>
      ) : null}
      <View style={styles.inputRow}>
        {icon ? <View style={styles.inputIcon}>{icon}</View> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }, style]}
          {...rest}
        />
        {accessory ? <View style={styles.inputAccessory}>{accessory}</View> : null}
      </View>
    </View>
  );
}

// ---------- Styles ----------

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    screen: { flex: 1, padding: 20 },
    text: { color: c.textBody, fontSize: 14, lineHeight: 20 },
    card: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.md,
      paddingVertical: 14,
      paddingHorizontal: Spacing.lg,
      borderWidth: 1,
      minHeight: 48,
    },
    buttonText: { fontSize: 14, fontWeight: '600' },
    confRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    confTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.surfaceElevated, overflow: 'hidden' },
    confFill: { height: '100%', borderRadius: 4 },
    confValue: { fontWeight: '700', minWidth: 40, textAlign: 'right' },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
    },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
    divider: { height: 1, backgroundColor: c.border, marginVertical: Spacing.md },
    inputWrap: { marginBottom: Spacing.md },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
    },
    inputIcon: { marginRight: Spacing.sm },
    inputAccessory: { marginLeft: Spacing.xs },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
    },
  });

const makeVariantStyles = (c: Palette): Record<TextVariant, object> => ({
  title: { fontSize: 28, fontWeight: '800', color: c.text },
  h1: { fontSize: 22, fontWeight: '800', color: c.text },
  h2: { fontSize: 17, fontWeight: '700', color: c.text },
  label: { fontSize: 13, fontWeight: '600', color: c.text },
  muted: { fontSize: 13, color: c.textMuted },
  small: { fontSize: 12 },
  mono: { fontFamily: Fonts.mono, fontSize: 14 },
  body: { fontSize: 14, lineHeight: 20 },
});

const makeButtonVariants = (
  c: Palette,
): Record<ButtonVariant, { bg: string; border: string; text: string }> => ({
  primary: { bg: c.primary, border: c.primary, text: '#FFFFFF' },
  gold: { bg: c.accent, border: c.accent, text: '#1A1A2E' },
  secondary: { bg: 'transparent', border: c.accent, text: c.accent },
  ghost: { bg: 'transparent', border: 'transparent', text: c.textMuted },
  danger: { bg: c.destructive, border: c.destructive, text: '#FFFFFF' },
  outline: { bg: 'transparent', border: c.border, text: c.text },
});

export { Fonts };
