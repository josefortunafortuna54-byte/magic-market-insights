import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ButtonVariant } from '@/components/ui';

export interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanCardProps {
  name: string;
  tagline: string;
  icon: keyof typeof Ionicons.glyphMap;
  price: string;
  highlight?: boolean;
  featured?: boolean;
  active?: boolean;
  badge?: string;
  dashed?: boolean;
  features: PlanFeature[];
  buttonTitle: string;
  buttonVariant?: ButtonVariant;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PlanCard({
  name,
  tagline,
  icon,
  price,
  highlight,
  featured,
  active,
  badge,
  dashed,
  features,
  buttonTitle,
  buttonVariant = highlight ? 'gold' : 'secondary',
  onPress,
  loading,
  disabled,
}: PlanCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const gold = highlight || featured;

  const card = (
    <View
      style={[
        styles.card,
        gold && (Platform.OS === 'web' ? styles.goldCard : styles.goldCardNative),
        active && styles.activeCard,
        dashed && styles.dashedCard,
      ]}>
      {gold ? <View style={styles.glow} pointerEvents="none" /> : null}
      {badge ? (
        <View style={[styles.badge, highlight ? styles.badgeFilled : styles.badgeOutline]}>
          <AppText
            variant="small"
            style={{ color: highlight ? '#0B0B0F' : colors.accent, fontWeight: '800', letterSpacing: 0.6 }}>
            {badge}
          </AppText>
        </View>
      ) : null}

      <View style={styles.header}>
        <LinearGradient
          colors={gold ? [`${colors.accent}30`, `${colors.accent}08`] : [colors.surfaceElevated, colors.surface]}
          style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Ionicons name={icon} size={22} color={gold ? colors.accent : colors.textMuted} />
        </LinearGradient>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <AppText variant="h2">{name}</AppText>
            {active ? (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark" size={11} color="#0B0B0F" />
                <AppText variant="small" style={{ color: '#0B0B0F', fontWeight: '800' }}>{t('components.planCard.active')}</AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="small" style={{ color: colors.textMuted }}>{tagline}</AppText>
        </View>
      </View>

      <View style={styles.priceRow}>
        <AppText style={[styles.price, gold && styles.priceGold]}>{price}</AppText>
        <AppText variant="muted">{t('components.planCard.perMonth')}</AppText>
      </View>

      <View style={styles.divider} />

      <View style={styles.features}>
        {features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.checkWrap, !f.included && styles.checkOff]}>
              <Ionicons
                name={f.included ? 'checkmark' : 'close'}
                size={12}
                color={f.included ? colors.success : colors.textFaint}
              />
            </View>
            <AppText
              variant="small"
              style={[styles.featureText, !f.included && styles.featureOff]}>
              {f.text}
            </AppText>
          </View>
        ))}
      </View>

      <AppButton
        title={buttonTitle}
        variant={buttonVariant}
        onPress={onPress}
        loading={loading}
        disabled={active || disabled}
      />
    </View>
  );

  return highlight && Platform.OS === 'web' ? (
    <LinearGradient
      colors={[`${colors.accent}14`, `${colors.accent}03`, colors.surface]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientWrap, styles.highlightWrap]}>
      {card}
    </LinearGradient>
  ) : (
    card
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    gradientWrap: {
      borderRadius: Radius.xl,
      padding: 1.5,
      marginBottom: Spacing.md,
    },
    highlightWrap: {
      borderColor: `${c.accent}55`,
      borderWidth: 1,
      shadowColor: c.accent,
      shadowOpacity: 0.18,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    card: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      gap: Spacing.md,
      overflow: 'hidden',
    },
    goldCard: {
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    goldCardNative: {
      borderColor: `${c.accent}66`,
      borderWidth: 1.5,
      backgroundColor: `${c.accent}0F`,
    },
    activeCard: {
      borderColor: `${c.success}AA`,
      borderWidth: 2,
    },
    dashedCard: {
      borderStyle: 'dashed',
      backgroundColor: `${c.surface}88`,
    },
    glow: {
      position: 'absolute',
      top: -70,
      right: -50,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: `${c.accent}12`,
    },
    badge: {
      position: 'absolute',
      top: 14,
      right: 14,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    badgeFilled: {
      backgroundColor: c.accent,
      shadowColor: c.accent,
      shadowOpacity: 0.4,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 6,
    },
    badgeOutline: {
      backgroundColor: `${c.accent}14`,
      borderColor: `${c.accent}55`,
      borderWidth: 1,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingRight: 60 },
    headerText: { flex: 1, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: c.success,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapActive: {
      borderColor: `${c.success}66`,
      backgroundColor: `${c.success}12`,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs, flexWrap: 'wrap' },
    price: { fontSize: 34, fontWeight: '800', color: c.text, letterSpacing: -0.5, lineHeight: 42 },
    priceGold: { color: c.accent },
    divider: { height: 1, backgroundColor: c.border, opacity: 0.6 },
    features: { gap: Spacing.sm },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    checkWrap: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: `${c.success}18`,
      borderColor: `${c.success}40`,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOff: {
      backgroundColor: 'transparent',
      borderColor: c.border,
    },
    featureText: { flex: 1, color: c.textBody },
    featureOff: { color: c.textMuted, textDecorationLine: 'line-through' },
  });
