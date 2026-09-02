import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Chip, EmptyState, Screen, Spinner } from '@/components/ui';
import { SectionHeader } from '@/components/SectionHeader';
import { PremiumLock } from '@/components/PremiumLock';
import { useAuth } from '@/hooks/useAuth';
import { useBoomHours } from '@/hooks/useBoomHours';
import { useSubscription } from '@/hooks/useSubscription';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  DEFAULT_BOOM_PREFS,
  VOL_TIERS,
  applyBoomPrefs,
  collectBoomPairs,
  loadBoomPrefs,
  saveBoomPrefs,
  type BoomPrefs,
} from '@/lib/boomPrefs';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

const VOL_TIER_KEYS = {
  todas: 'definicoesBooms.volAll',
  alta: 'definicoesBooms.volHigh',
  media: 'definicoesBooms.volMedium',
  baixa: 'definicoesBooms.volLow',
} as const;

async function enableNotifications(t: TFunction) {
  const granted = await requestNotificationPermission();
  if (!granted) {
    Alert.alert(t('notificacoes.title'), t('definicoesBooms.enableNotification'));
  }
}

export default function DefinicoesBoomsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPremium, planTier, loading: subLoading } = useSubscription();
  const { hours, loading: hoursLoading, error: hoursError } = useBoomHours();
  const [prefs, setPrefs] = useState<BoomPrefs | null>(null);

  const premium = isPremium && planTier === 'premium';
  const userId = user?.id;

  useEffect(() => {
    let active = true;
    loadBoomPrefs(userId).then((p) => {
      if (active) setPrefs(p);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const update = useCallback(
    (patch: Partial<BoomPrefs>) => {
      setPrefs((prev) => {
        const next = { ...(prev ?? DEFAULT_BOOM_PREFS), ...patch };
        saveBoomPrefs(next, userId);
        return next;
      });
    },
    [userId],
  );

  const allPairs = useMemo(() => collectBoomPairs(hours), [hours]);
  const visibleCount = useMemo(
    () => (prefs ? applyBoomPrefs(hours, prefs).length : hours.length),
    [hours, prefs],
  );

  const togglePair = (pair: string) => {
    if (!prefs) return;
    const has = prefs.pairs.includes(pair);
    update({ pairs: has ? prefs.pairs.filter((p) => p !== pair) : [...prefs.pairs, pair] });
  };

  const toggleHidden = (id: string) => {
    if (!prefs) return;
    const hidden = prefs.hiddenIds.includes(id);
    update({ hiddenIds: hidden ? prefs.hiddenIds.filter((x) => x !== id) : [...prefs.hiddenIds, id] });
  };

  const reset = () => {
    update({ pairs: [], volTier: 'todas', hiddenIds: [] });
  };

  return (
    <Screen>
      <View style={styles.notifCard}>
        <View style={styles.notifIcon}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label">{t('definicoesBooms.alarmsTitle')}</AppText>
          <AppText variant="small" style={{ color: colors.textMuted }}>
            {t('definicoesBooms.alarmsDesc')}
          </AppText>
        </View>
        <Pressable onPress={() => enableNotifications(t)} hitSlop={8}>
          <AppText style={{ color: colors.primary, fontWeight: '700' }}>{t('definicoesBooms.enable')}</AppText>
        </Pressable>
      </View>

      {subLoading || prefs === null ? (
        <Spinner label={t('definicoesBooms.loading')} />
      ) : !premium ? (
        <View style={{ marginTop: Spacing.md }}>
          <PremiumLock
            label={t('definicoesBooms.lockTitle')}
            description={t('definicoesBooms.lockDesc')}
          />
        </View>
      ) : hoursLoading ? (
        <Spinner label={t('definicoesBooms.loadingBooms')} />
      ) : hoursError ? (
        <EmptyState title={t('definicoesBooms.errorTitle')} subtitle={hoursError} />
      ) : (
        <>
          <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
            {t('definicoesBooms.visibleCount', { visible: visibleCount, total: hours.length })}
          </AppText>

          <SectionHeader title={t('definicoesBooms.trend')} subtitle={t('definicoesBooms.windowsByVol')} />
          <View style={styles.chips}>
            {VOL_TIERS.map((tier) => (
              <Chip
                key={tier.key}
                label={t(VOL_TIER_KEYS[tier.key])}
                active={prefs.volTier === tier.key}
                onPress={() => update({ volTier: tier.key })}
              />
            ))}
          </View>
          <AppText variant="small" style={{ color: colors.textMuted, marginBottom: Spacing.lg }}>
            {t('definicoesBooms.volHint')}
          </AppText>

          <SectionHeader title={t('definicoesBooms.pairs')} subtitle={t('definicoesBooms.pairsHint')} />
          <View style={styles.chips}>
            <Chip label={t('definicoesBooms.all')} active={prefs.pairs.length === 0} onPress={() => update({ pairs: [] })} />
            {allPairs.map((p) => (
              <Chip key={p} label={p} active={prefs.pairs.includes(p)} onPress={() => togglePair(p)} />
            ))}
          </View>
          {allPairs.length === 0 ? (
            <AppText variant="muted" style={{ marginBottom: Spacing.lg }}>
              {t('definicoesBooms.noPairs')}
            </AppText>
          ) : null}

          <SectionHeader title={t('definicoesBooms.filterBooms')} subtitle={t('definicoesBooms.filterDesc')} />
          {hours.length === 0 ? (
            <EmptyState title={t('definicoesBooms.emptyTitle')} />
          ) : (
            hours.map((h) => {
              const hidden = prefs.hiddenIds.includes(h.id);
              return (
                <View key={h.id} style={[styles.boomRow, hidden && styles.boomRowHidden]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="label" style={hidden ? styles.boomTitleHidden : undefined}>{h.title}</AppText>
                    <AppText variant="small" style={{ color: colors.textMuted }}>
                      {h.time_wat} WAT · {(h.pairs || []).join(', ')}
                    </AppText>
                  </View>
                  <Switch
                    value={!hidden}
                    onValueChange={() => toggleHidden(h.id)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.text}
                  />
                </View>
              );
            })
          )}

          <View style={{ marginTop: Spacing.md }}>
            <AppButton title={t('definicoesBooms.reset')} variant="ghost" onPress={reset} />
          </View>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: `${c.primary}0D`,
    borderColor: `${c.primary}40`,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${c.primary}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  boomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  boomRowHidden: { opacity: 0.55 },
  boomTitleHidden: { textDecorationLine: 'line-through' },
});
