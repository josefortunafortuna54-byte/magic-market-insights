import { StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Screen } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageList } from '@/components/community/MessageList';
import { PremiumLock } from '@/components/PremiumLock';
import { useAuth } from '@/hooks/useAuth';
import { useChannels } from '@/hooks/useChannels';
import { useMessages } from '@/hooks/useMessages';
import { useProfiles } from '@/hooks/useProfiles';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { type Palette } from '@/core/theme';

export default function ChannelScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { channelId, pendingImageUri } = useLocalSearchParams<{ channelId: string; pendingImageUri?: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();
  const channels = useChannels();
  const profiles = useProfiles();

  const channel = channels.regular.find((c) => c.id === channelId);
  const messages = useMessages({ channelId });

  const openProfile = (userId: string) => {
    router.push({ pathname: '/comunidade/user/[userId]', params: { userId } });
  };

  // Premium nunca vê bloqueio — nem durante o arranque, enquanto o plano
  // ainda está a ser confirmado.
  if (subLoading && !channel) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ title: '#' }} />
        <AppText variant="muted">{t('common.loading')}</AppText>
      </Screen>
    );
  }

  if (!subLoading && channel?.is_premium && !isPremium) {
    return (
      <Screen>
        <Stack.Screen options={{ title: channel?.display_name || '#' }} />
        <View style={styles.lockWrap}>
          <PremiumLock
            label={channel?.display_name || '#'}
            description={t('analises.premiumDesc')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: channel?.display_name || '#' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding">
        <MessageList
          messages={messages.messages}
          reactions={messages.reactions}
          mentionsByMessage={messages.mentionsByMessage}
          profiles={profiles.profiles}
          currentUserId={user?.id ?? null}
          hasOlder={messages.hasOlder}
          loadingOlder={messages.loadingOlder}
          loading={messages.loading || (!channel && channels.loading)}
          error={messages.error}
          onLoadOlder={messages.loadOlder}
          onToggleReaction={messages.toggleReaction}
          onRetry={messages.retry}
          onDelete={(message) => messages.softDelete(message.id)}
          onEdit={(message, text) => messages.edit(message, text)}
          onReload={messages.refresh}
          onOpenProfile={openProfile}
        />
        <Composer
          onSend={(text, imageUrl, mentionIds) => messages.send(text, imageUrl, mentionIds)}
          profiles={profiles.profiles}
          currentUserId={user?.id ?? null}
          initialImageUri={pendingImageUri}
        />
      </KeyboardAvoidingView>
      {!channel && !channels.loading && !messages.loading ? (
        <AppText style={styles.missing}>{t('workspace.emptyChannels')}</AppText>
      ) : null}
    </Screen>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: { flex: 1 },
  lockWrap: { flex: 1, justifyContent: 'center', padding: 16 },
  missing: { position: 'absolute', bottom: 0, left: 16, right: 16, color: c.textMuted },
});
