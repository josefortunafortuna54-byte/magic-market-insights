import { StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Screen } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageList } from '@/components/community/MessageList';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useProfiles } from '@/hooks/useProfiles';
import { useTheme } from '@/hooks/useTheme';
import { type Palette } from '@/core/theme';

export default function DmScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const conversations = useConversations();
  const profiles = useProfiles();

  const dm = conversations.dms.find((d) => d.conversationId === conversationId);
  const messages = useMessages({ conversationId });

  const otherName = dm ? profiles.profiles[dm.memberId]?.display_name : undefined;

  const openProfile = (userId: string) => {
    router.push({ pathname: '/comunidade/user/[userId]', params: { userId } });
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: otherName || '…' }} />
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
          loading={messages.loading || (!dm && conversations.loading)}
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
        />
      </KeyboardAvoidingView>
      {!dm && !conversations.loading && !messages.loading ? (
        <AppText style={styles.missing}>{t('workspace.emptyDms')}</AppText>
      ) : null}
    </Screen>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  container: { flex: 1 },
  missing: { position: 'absolute', bottom: 0, left: 16, right: 16, color: c.textMuted },
});
