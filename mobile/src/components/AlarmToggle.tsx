import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Spinner } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  cancelBoomAlarm,
  getBoomAlarm,
  scheduleBoomAlarm,
} from '@/lib/notifications';

export function AlarmToggle({
  boomId,
  boomTime,
  title,
}: {
  boomId: string;
  boomTime: string;
  title: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    getBoomAlarm(boomId).then((alarm) => {
      if (active) {
        setArmed(!!alarm);
        setBusy(false);
      }
    });
    return () => {
      active = false;
    };
  }, [boomId]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (armed) {
        await cancelBoomAlarm(boomId);
        setArmed(false);
      } else {
        const ok = await scheduleBoomAlarm(boomId, boomTime, title);
        if (ok) {
          setArmed(true);
        } else {
          setBlocked(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }, [armed, busy, boomId, boomTime, title]);

  if (busy) return <Spinner />;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        style={[styles.button, armed && styles.armed]}>
        <Ionicons
          name={armed ? 'notifications' : 'notifications-outline'}
          size={16}
          color={armed ? colors.bg : colors.accent}
        />
        <AppText variant="small" style={{ color: armed ? colors.bg : colors.accent, fontWeight: '700' }}>
          {armed ? t('components.alarmToggle.active') : t('components.alarmToggle.activate')}
        </AppText>
      </Pressable>
      {armed ? (
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {t('components.alarmToggle.hint5min')}
        </AppText>
      ) : null}
      {blocked ? (
        <AppText variant="small" style={{ color: colors.destructive }}>
          {t('components.alarmToggle.blocked')}
        </AppText>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { gap: Spacing.xs, marginTop: Spacing.xs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: `${c.accent}1A`,
    borderColor: `${c.accent}55`,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  armed: { backgroundColor: c.accent, borderColor: c.accent },
});
