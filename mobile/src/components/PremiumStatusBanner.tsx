import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';

const DISMISS_PREFIX = 'premium_renew_dismissed_';
const EXPIRING_DAYS = 7;
const DAY_MS = 86_400_000;

const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Banner de retenção no início:
 * - plano a expirar em <= 7 dias: aviso amarelo com CTA Renovar (dispensável por dia)
 * - plano expirado: aviso vermelho permanente com CTA Renovar
 */
export function PremiumStatusBanner() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { subscription, isPremium, loading } = useSubscription();
  const [dismissedDate, setDismissedDate] = useState<string | null>(null);
  const [dismissLoaded, setDismissLoaded] = useState(false);
  const [status, setStatus] = useState<{ mode: 'expired' | 'expiring'; daysLeft: number; endDate: Date } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let nextStatus: { mode: 'expired' | 'expiring'; daysLeft: number; endDate: Date } | null = null;
      const rawEnd = !loading && subscription?.status === 'active' ? subscription.current_period_end : null;
      if (rawEnd) {
        const endDate = new Date(rawEnd);
        if (!Number.isNaN(endDate.getTime())) {
          const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / DAY_MS);
          if (!isPremium && daysLeft < 0) nextStatus = { mode: 'expired', daysLeft, endDate };
          else if (isPremium && daysLeft >= 0 && daysLeft <= EXPIRING_DAYS) {
            nextStatus = { mode: 'expiring', daysLeft, endDate };
          }
        }
      }

      let dismissed: string | null = null;
      try {
        dismissed = (await AsyncStorage.getItem(`${DISMISS_PREFIX}${todayKey()}`)) ?? null;
      } catch {}

      if (cancelled) return;
      setStatus(nextStatus);
      setDismissedDate(dismissed);
      setDismissLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPremium, loading, subscription]);

  if (!status) return null;

  // Expirado: estado crítico, não dispensável.
  if (status.mode === 'expired') {
    return (
      <Pressable
        style={[styles.banner, styles.expired]}
        onPress={() => router.push('/planos')}
        accessibilityRole="button"
        accessibilityLabel={t('premiumBanner.expiredTitle')}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle" size={20} color={colors.destructive} />
        </View>
        <View style={styles.texts}>
          <AppText variant="label" numberOfLines={1}>{t('premiumBanner.expiredTitle')}</AppText>
          <AppText variant="small" style={styles.sub} numberOfLines={2}>
            {t('premiumBanner.expiredSub', {
              date: status.endDate.toLocaleDateString(i18n.language || 'pt-PT'),
            })}
          </AppText>
        </View>
        <View style={styles.renewPill}>
          <AppText variant="small" style={styles.renewText}>{t('premiumBanner.renew')}</AppText>
          <Ionicons name="chevron-forward" size={12} color="#0A0A0A" />
        </View>
      </Pressable>
    );
  }

  // A expirar: nudge renovável, dispensável durante o dia.
  if (dismissedDate === todayKey()) return null;
  return (
      <Pressable
        style={[styles.banner, styles.expiring]}
        onPress={() => router.push('/planos')}
        accessibilityRole="button"
        accessibilityLabel={t('premiumBanner.renew')}>
        <View style={[styles.iconWrap, styles.expiringIcon]}>
          <Ionicons name="time" size={20} color={colors.warning} />
        </View>
        <View style={styles.texts}>
          <AppText variant="label" numberOfLines={1}>
            {t('premiumBanner.expiringTitle', { count: status.daysLeft })}
          </AppText>
          <AppText variant="small" style={styles.sub} numberOfLines={2}>
            {t('premiumBanner.expiringSub')}
          </AppText>
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => {
            const key = todayKey();
            setDismissedDate(key);
            AsyncStorage.setItem(`${DISMISS_PREFIX}${key}`, key).catch(() => {});
          }}
          accessibilityRole="button"
          accessibilityLabel={String(t('common.close'))}
          style={styles.dismiss}>
          <Ionicons name="close" size={16} color={colors.textFaint} />
        </Pressable>
      </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
    },
    expired: {
      borderColor: `${c.destructive}55`,
      backgroundColor: `${c.destructive}14`,
    },
    expiring: {
      borderColor: `${c.warning}44`,
      backgroundColor: `${c.warning}12`,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${c.destructive}1F`,
    },
    expiringIcon: {
      backgroundColor: `${c.warning}1A`,
    },
    texts: {
      flex: 1,
      gap: 2,
    },
    sub: {
      color: c.textMuted,
    },
    renewPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: c.accent,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    renewText: {
      color: '#0A0A0A',
      fontWeight: '800',
    },
    dismiss: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
