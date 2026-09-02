import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge, EmptyState, Spinner } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { BOT_USER_ID, isUserOnline } from '@/core/community';
import { timeAgo } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { findOrCreateConversation } from '@/lib/community';
import { supabase } from '@/lib/supabase';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profiles, loading } = useProfiles();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);

  const profile = userId ? profiles[userId] : undefined;
  const isOwn = userId === user?.id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsPremium(null);
      if (!userId) return;
      try {
        const { data } = await supabase.rpc('is_premium', { uid: userId });
        if (mounted) setIsPremium(data === true);
      } catch {
        if (mounted) setIsPremium(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const openDm = useCallback(async () => {
    if (!user || !userId || profile?.role === 'admin') return;
    setStarting(true);
    try {
      const conversationId = await findOrCreateConversation(user.id, userId);
      router.replace({
        pathname: '/comunidade/dm/[conversationId]',
        params: { conversationId },
      });
    } catch {
      setStarting(false);
      Alert.alert(t('comunidade.errorTitle'), t('workspace.failed'));
    }
  }, [user, userId, profile?.role, t]);

  if (loading && !profile) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: t('userProfile.title') }} />
        <Spinner label={t('workspace.loading')} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: t('userProfile.title') }} />
        <EmptyState title={t('userProfile.notFound')} />
      </View>
    );
  }

  const canDm = !isOwn && profile.role !== 'admin' && profile.user_id !== BOT_USER_ID;
  const online = isUserOnline(profile);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: t('userProfile.title') }} />
      <View style={styles.card}>
        <UserAvatar
          name={profile.display_name}
          avatarUrl={profile.avatar_url}
          role={profile.role}
          size={84}
        />
        <View style={styles.nameRow}>
          <AppText variant="h1">{profile.display_name}</AppText>
          {profile.role === 'admin' ? (
            <Badge color={colors.accent} bg={`${colors.accent}20`}>{t('userProfile.admin')}</Badge>
          ) : null}
        </View>

        {online ? (
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <AppText variant="muted">{t('userProfile.online')}</AppText>
          </View>
        ) : (
          <AppText variant="muted" style={styles.lastSeen}>
            {t('userProfile.lastSeenAgo', {
              time: timeAgo(profile.last_seen_at || profile.created_at),
            })}
          </AppText>
        )}

        <AppText variant="small" style={styles.memberSince}>
          {t('userProfile.memberSince', {
            date: new Date(profile.created_at).toLocaleDateString(),
          })}
        </AppText>

        <View style={styles.badgeWrap}>
          {isPremium ? (
            <Badge color={colors.accent} bg={`${colors.accent}20`}>{t('userProfile.premium')}</Badge>
          ) : (
            <Badge color={colors.textMuted} bg={`${colors.textMuted}20`}>{t('userProfile.freePlan')}</Badge>
          )}
        </View>

        {canDm ? (
          <AppButton
            title={t('userProfile.sendMessage')}
            onPress={openDm}
            loading={starting}
            style={styles.dmButton}
          />
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  lastSeen: { textAlign: 'center' },
  memberSince: { color: colors.textFaint },
  badgeWrap: { marginTop: Spacing.sm },
  dmButton: { alignSelf: 'stretch', marginTop: Spacing.md },
});
