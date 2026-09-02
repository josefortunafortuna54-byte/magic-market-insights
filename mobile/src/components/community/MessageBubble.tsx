import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput, View, type AlertButton } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { isUserOnline, REACTION_EMOJIS } from '@/core/community';
import { timeAgo } from '@/core/format';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Message, MessageReaction, UserProfile } from '@/core/types';

type BubbleStyles = ReturnType<typeof makeStyles>;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderMentionedText(text: string, mentionNames: string[], styles: BubbleStyles): ReactNode {
  if (mentionNames.length === 0) return <AppText>{text}</AppText>;
  const names = [...mentionNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${names.map((n) => `@${escapeRegex(n)}`).join('|')})`, 'g');
  const parts = text.split(pattern);
  const isMention = (part: string) => names.some((n) => part === `@${n}`);
  return (
    <AppText>
      {parts.map((part, i) =>
        isMention(part) ? (
          <AppText key={i} style={styles.mention}>
            {part}
          </AppText>
        ) : (
          <AppText key={i}>{part}</AppText>
        ),
      )}
    </AppText>
  );
}

export function MessageBubble({
  message,
  reactions,
  mentionNames = [],
  profile,
  currentUserId,
  onToggleReaction,
  onRetry,
  onDelete,
  onEdit,
  onOpenProfile,
}: {
  message: Message;
  reactions: MessageReaction[];
  mentionNames?: string[];
  profile?: UserProfile;
  currentUserId: string | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: Message) => void;
  onDelete: (message: Message) => void;
  onEdit: (message: Message, text: string) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const isOwn = message.user_id === currentUserId;
  const name = profile?.display_name || t('common.trader');
  const editable =
    isOwn && !message.boom_id && !message.pending && !message.failed;

  const openProfile = () => {
    if (onOpenProfile && profile) onOpenProfile(profile.user_id);
  };

  const grouped = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const g = grouped.get(r.emoji) || { count: 0, mine: false };
    g.count += 1;
    if (r.user_id === currentUserId) g.mine = true;
    grouped.set(r.emoji, g);
  }

  const onLongPress = () => {
    if (isOwn) {
      const actions: AlertButton[] = [];
      if (editable) {
        actions.push({
          text: t('workspace.edit'),
          onPress: () => { setDraft(message.text); setEditing(true); },
        });
      }
      actions.push({
        text: t('workspace.deleteMessage'),
        style: 'destructive',
        onPress: () => onDelete(message),
      });
      Alert.alert(t('workspace.messageActions'), undefined, [
        ...actions,
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    } else {
      Alert.alert(t('workspace.reportMessage') || 'Reportar', undefined, [
        { text: 'Spam', onPress: () => handleReport('spam') },
        { text: 'Assédio', onPress: () => handleReport('harassment') },
        { text: 'Inadequado', onPress: () => handleReport('inappropriate') },
        { text: 'Outro', onPress: () => handleReport('other') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const handleReport = useCallback(async (reason: string) => {
    try {
      const { reportMessage } = await import('@/lib/community');
      await reportMessage(message.id, reason);
      Alert.alert(t('common.ok') || 'OK', t('workspace.reportSent') || 'Report enviado.');
    } catch {
      Alert.alert(t('common.error') || 'Erro', t('workspace.reportFailed') || 'Não foi possível enviar.');
    }
  }, [message.id, t]);

  const onAddReaction = () => {
    Alert.alert(
      t('workspace.react'),
      undefined,
      [
        ...REACTION_EMOJIS.map((emoji) => ({
          text: emoji,
          onPress: () => onToggleReaction(message.id, emoji),
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };

  const saveEdit = () => {
    if (!draft.trim()) return;
    onEdit(message, draft);
    setEditing(false);
    setDraft('');
  };

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      {!isOwn ? (
        <UserAvatar
          name={name}
          avatarUrl={profile?.avatar_url}
          role={profile?.role}
          size={28}
          online={isUserOnline(profile)}
          onPress={onOpenProfile ? openProfile : undefined}
          style={styles.avatar}
        />
      ) : null}

      <Pressable
        onLongPress={onLongPress}
        style={[styles.bubble, isOwn && styles.bubbleOwn]}
      >
        <View style={styles.meta}>
          {!isOwn ? (
            <Pressable onPress={openProfile} disabled={!onOpenProfile} style={styles.name}>
              <AppText variant="small" style={styles.nameText}>{name}</AppText>
            </Pressable>
          ) : null}
          {profile?.role === 'admin' ? (
            <Badge color={colors.accent} bg={`${colors.accent}1F`}>{t('workspace.bot')}</Badge>
          ) : null}
          <AppText variant="small" style={styles.time}>{timeAgo(message.created_at)}</AppText>
          {message.edited_at ? (
            <AppText variant="small" style={styles.edited}>{t('workspace.edited')}</AppText>
          ) : null}
        </View>

        {message.image_url ? (
          <Image source={{ uri: message.image_url }} style={styles.image} resizeMode="cover" />
        ) : null}

        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('workspace.editPlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus
            multiline
            style={styles.editInput}
          />
        ) : message.text ? (
          renderMentionedText(message.text, mentionNames, styles)
        ) : null}

        {editing ? (
          <View style={styles.editActions}>
            <AppButton
              title={t('workspace.save')}
              onPress={saveEdit}
              disabled={!draft.trim()}
              style={styles.editSave}
            />
            <AppButton
              title={t('common.cancel')}
              variant="ghost"
              onPress={cancelEdit}
              style={styles.editCancel}
            />
          </View>
        ) : null}

        {message.failed ? (
          <Pressable onPress={() => onRetry(message)} style={styles.failedRow}>
            <Ionicons name="refresh" size={14} color={colors.destructive} />
            <AppText variant="small" style={{ color: colors.destructive, fontWeight: '600' }}>
              {t('workspace.failed')} — {t('workspace.retry')}
            </AppText>
          </Pressable>
        ) : message.pending ? (
          <AppText variant="small" style={{ color: colors.textFaint }}>{t('workspace.loading')}</AppText>
        ) : null}

        <View style={styles.reactions}>
          {[...grouped.entries()].map(([emoji, g]) => (
            <Pressable
              key={emoji}
              onPress={() => onToggleReaction(message.id, emoji)}
              style={[styles.reactionChip, g.mine && styles.reactionMine]}
            >
              <AppText variant="small">{emoji} {g.count}</AppText>
            </Pressable>
          ))}
          <Pressable onPress={onAddReaction} style={styles.reactionAdd}>
            <Ionicons name="add" size={12} color={colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    rowOwn: { justifyContent: 'flex-end' },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    bubble: {
      flexShrink: 1,
      maxWidth: '82%',
      backgroundColor: c.surfaceElevated,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      gap: Spacing.xs,
    },
    bubbleOwn: { backgroundColor: c.surface },
    meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    name: { flex: 1 },
    nameText: { fontWeight: '700' },
    mention: { color: c.primary, fontWeight: '700' },
    time: { color: c.textMuted },
    edited: { color: c.textFaint, fontStyle: 'italic' },
    image: { width: 200, height: 140, borderRadius: Radius.sm },
    editInput: {
      backgroundColor: c.bg,
      borderRadius: Radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: c.text,
      maxHeight: 120,
    },
    editActions: { flexDirection: 'row', gap: Spacing.sm },
    editSave: { paddingVertical: 6, paddingHorizontal: 16 },
    editCancel: { paddingVertical: 6, paddingHorizontal: 16 },
    failedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, alignItems: 'center' },
    reactionChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: `${c.primary}1F`,
    },
    reactionMine: { backgroundColor: `${c.primary}4D` },
    reactionAdd: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
