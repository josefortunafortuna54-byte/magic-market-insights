import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { isUserOnline } from '@/core/community';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { UserProfile } from '@/core/types';
import type { DmSummary } from '@/hooks/useConversations';

export function DmRow({
  dm,
  profiles,
  index = 0,
  onPress,
  onOpenProfile,
}: {
  dm: DmSummary;
  profiles: Record<string, UserProfile>;
  index?: number;
  onPress: () => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const profile = profiles[dm.memberId];
  const name = profile?.display_name || t('common.trader');
  const online = isUserOnline(profile);

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <UserAvatar
          name={name}
          avatarUrl={profile?.avatar_url}
          role={profile?.role}
          size={40}
          online={online}
          onPress={onOpenProfile ? () => onOpenProfile(dm.memberId) : undefined}
        />
        <View style={styles.info}>
          <AppText numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, online && styles.statusDotOnline]} />
            <AppText variant="small" style={online ? styles.onlineText : styles.offlineText}>
              {online ? t('workspace.dmOnline') : t('workspace.dmOffline')}
            </AppText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.sm + 2,
    },
    pressed: { backgroundColor: c.surfaceElevated, transform: [{ scale: 0.99 }] },
    info: { flex: 1, gap: 3 },
    name: { color: c.text, fontWeight: '700' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.textFaint },
    statusDotOnline: { backgroundColor: c.live },
    onlineText: { color: c.live, fontWeight: '600' },
    offlineText: { color: c.textFaint },
  });
