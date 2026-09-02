import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, EmptyState, Screen, Spinner } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { useChannels } from '@/hooks/useChannels';
import { useConversations } from '@/hooks/useConversations';
import { useMessageSearch } from '@/hooks/useMessageSearch';
import { useProfiles } from '@/hooks/useProfiles';
import { useTheme } from '@/hooks/useTheme';
import { timeAgo } from '@/core/format';
import { Radius, Spacing, type Palette } from '@/core/theme';
import type { Message } from '@/core/types';

export default function PesquisaScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { results, loading } = useMessageSearch(query);
  const channels = useChannels();
  const conversations = useConversations();
  const profiles = useProfiles();

  const channelName = useMemo(
    () => new Map(channels.channels.map((c) => [c.id, c.display_name])),
    [channels.channels],
  );
  const dmName = useMemo(() => {
    const map = new Map<string, string>();
    for (const dm of conversations.dms) {
      const name = profiles.profiles[dm.memberId]?.display_name;
      if (name) map.set(dm.conversationId, name);
    }
    return map;
  }, [conversations.dms, profiles.profiles]);

  const open = (m: Message) => {
    if (m.channel_id) {
      router.push({ pathname: '/comunidade/canais/[channelId]', params: { channelId: m.channel_id } });
    } else if (m.conversation_id) {
      router.push({
        pathname: '/comunidade/dm/[conversationId]',
        params: { conversationId: m.conversation_id },
      });
    }
  };

  const targetLabel = (m: Message) => {
    if (m.channel_id) return channelName.get(m.channel_id);
    if (m.conversation_id) return dmName.get(m.conversation_id);
    return undefined;
  };

  const renderItem = ({ item }: { item: Message }) => {
    const sender = profiles.profiles[item.user_id]?.display_name;
    const target = targetLabel(item);
    return (
      <Pressable onPress={() => open(item)} style={styles.row}>
        <UserAvatar
          name={sender || '?'}
          avatarUrl={profiles.profiles[item.user_id]?.avatar_url}
          role={profiles.profiles[item.user_id]?.role}
          size={36}
        />
        <View style={styles.rowBody}>
          <View style={styles.rowMeta}>
            <AppText variant="small" style={styles.sender} numberOfLines={1}>
              {sender}
            </AppText>
            {target ? (
              <AppText variant="small" style={styles.target} numberOfLines={1}>
                {target}
              </AppText>
            ) : null}
            <AppText variant="small" style={styles.time}>{timeAgo(item.created_at)}</AppText>
          </View>
          <AppText numberOfLines={2} style={styles.preview}>
            {item.text}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Pressable>
    );
  };

  return (
    <Screen scroll={false}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('workspace.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <Spinner label={t('workspace.loading')} />
      ) : query.trim().length === 0 ? (
        <EmptyState title={t('workspace.searchEmpty')} />
      ) : results.length === 0 ? (
        <EmptyState title={t('workspace.searchEmpty')} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  list: { paddingBottom: Spacing.md, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  rowBody: { flex: 1, gap: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sender: { fontWeight: '700', flexShrink: 1 },
  target: { color: colors.primary, flexShrink: 1 },
  time: { color: colors.textFaint, marginLeft: 'auto' },
  preview: { color: colors.textMuted },
});
