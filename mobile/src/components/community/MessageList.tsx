import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, EmptyState } from '@/components/ui';
import { MessageBubble } from '@/components/community/MessageBubble';
import { BoomMessage } from '@/components/community/BoomMessage';
import { formatChatDate } from '@/core/format';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Message, MessageReaction, UserProfile } from '@/core/types';

type ListItem =
  | { type: 'header'; key: string; date: string }
  | { type: 'message'; key: string; message: Message };

export function MessageList({
  messages,
  reactions,
  mentionsByMessage,
  profiles,
  currentUserId,
  hasOlder,
  loadingOlder,
  loading = false,
  error,
  onLoadOlder,
  onToggleReaction,
  onRetry,
  onDelete,
  onEdit,
  onReload,
  onOpenProfile,
}: {
  messages: Message[];
  reactions: MessageReaction[];
  mentionsByMessage: Record<string, string[]>;
  profiles: Record<string, UserProfile>;
  currentUserId: string | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  loading?: boolean;
  error?: string | null;
  onLoadOlder: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: Message) => void;
  onDelete: (message: Message) => void;
  onEdit: (message: Message, text: string) => void;
  onReload?: () => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const listRef = useRef<FlatList<ListItem>>(null);
  const [nearBottom, setNearBottom] = useState(true);

  const items = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];
    let lastDay = '';
    for (const m of messages) {
      const day = formatChatDate(m.created_at);
      if (day !== lastDay) {
        out.push({ type: 'header', key: `h-${day}`, date: day });
        lastDay = day;
      }
      out.push({ type: 'message', key: `m-${m.id}`, message: m });
    }
    return out;
  }, [messages]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setNearBottom(
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 80,
    );
  };

  const renderItem: ListRenderItem<ListItem> = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dayHeader}>
          <AppText variant="small" style={styles.dayText}>{item.date}</AppText>
        </View>
      );
    }
    const m = item.message;
    if (m.boom_id) return <BoomMessage message={m} />;
    const mentionNames = (mentionsByMessage[m.id] || [])
      .map((uid) => profiles[uid]?.display_name)
      .filter((n): n is string => !!n);
    return (
      <MessageBubble
        message={m}
        reactions={reactions.filter((r) => r.message_id === m.id)}
        mentionNames={mentionNames}
        profile={profiles[m.user_id]}
        currentUserId={currentUserId}
        onToggleReaction={onToggleReaction}
        onRetry={onRetry}
        onDelete={onDelete}
        onEdit={onEdit}
        onOpenProfile={onOpenProfile}
      />
    );
  };

  if (loading && messages.length === 0 && !error) {
    return (
      <View style={styles.empty}>
        {[0, 1, 2, 3].map((i) => {
          const own = i % 2 === 1;
          return (
            <View key={i} style={[styles.skRow, own && styles.skRowOwn]}>
              {!own ? <View style={styles.skAvatar} /> : null}
              <View style={own ? styles.skBubbleOwn : styles.skBubble}>
                <View style={own ? styles.skLineOwn : styles.skLine} />
                <View style={styles.skLineMeta} />
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={styles.empty}>
        {error ? (
          <>
            <EmptyState title={t('workspace.errorTitle')} subtitle={error} />
            {onReload ? (
              <Pressable onPress={onReload} style={styles.reload}>
                <AppText variant="small" style={styles.reloadText}>
                  {t('workspace.retry')}
                </AppText>
              </Pressable>
            ) : null}
          </>
        ) : (
          <EmptyState title={t('workspace.noMessages')} />
        )}
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      ListHeaderComponent={
        hasOlder ? (
          <Pressable onPress={onLoadOlder} style={styles.older} disabled={loadingOlder}>
            <Ionicons name="chevron-up" size={14} color={colors.textMuted} />
            <AppText variant="small" style={{ color: colors.textMuted, fontWeight: '600' }}>
              {loadingOlder ? t('workspace.loading') : t('workspace.loadOlder')}
            </AppText>
          </Pressable>
        ) : null
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        if (nearBottom) listRef.current?.scrollToEnd({ animated: false });
      }}
      onScrollToIndexFailed={() => {}}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    empty: { flex: 1, justifyContent: 'center' },
    list: { paddingBottom: Spacing.md, gap: Spacing.md },
    skRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    skRowOwn: { justifyContent: 'flex-end' },
    skAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.surfaceElevated,
    },
    skBubble: {
      width: '62%',
      backgroundColor: c.surfaceElevated,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      gap: Spacing.sm,
    },
    skBubbleOwn: {
      width: '55%',
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      gap: Spacing.sm,
    },
    skLine: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.bg,
      width: '86%',
    },
    skLineOwn: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.surfaceElevated,
      width: '78%',
      alignSelf: 'flex-end',
    },
    skLineMeta: {
      height: 7,
      width: '34%',
      borderRadius: 4,
      backgroundColor: c.bg,
      opacity: 0.6,
    },
    dayHeader: { alignItems: 'center', paddingVertical: Spacing.sm },
    dayText: { color: c.textMuted, fontWeight: '700' },
    older: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
    },
    reload: {
      alignSelf: 'center',
      marginTop: Spacing.xs,
      backgroundColor: `${c.primary}1F`,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    reloadText: { color: c.primary, fontWeight: '700' },
  });
