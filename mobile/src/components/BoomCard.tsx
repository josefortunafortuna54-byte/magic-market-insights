import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { File } from 'expo-file-system';
import type { BoomComment, BoomTime, BoomVote } from '@/core/types';
import { getBoomStatus, boomCountdown } from '@/core/booms';
import { formatDateTimeWAT, timeAgo, displayName, avatarLetter } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  AppButton,
  AppText,
  Badge,
  Card,
  ConfidenceBar,
} from '@/components/ui';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioRecorderButton, type RecordedAudio } from '@/components/AudioRecorder';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { castVote } from '@/hooks/useBooms';

function StatusBadge({ boom }: { boom: BoomTime }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const status = getBoomStatus(boom.boom_time);
  if (status === 'live') return <Badge color={colors.live} bg={`${colors.live}1F`}>{t('components.boomCard.live')}</Badge>;
  if (status === 'upcoming') return <Badge color={colors.warning} bg={`${colors.warning}1F`}>{t('components.boomCard.upcoming')}</Badge>;
  return <Badge color={colors.textMuted} bg={`${colors.textMuted}1F`}>{t('components.boomCard.closed')}</Badge>;
}

function Countdown({ boomTime }: { boomTime: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [text, setText] = useState(boomCountdown(boomTime));
  useEffect(() => {
    const id = setInterval(() => setText(boomCountdown(boomTime)), 1000);
    return () => clearInterval(id);
  }, [boomTime]);

  const live = getBoomStatus(boomTime) === 'live';
  const spaced = text.replace(/(\d{2}):(\d{2}):(\d{2})/, '$1 : $2 : $3');
  return <AppText variant="mono" style={[styles.countdown, live && { color: colors.live }]}>{spaced}</AppText>;
}

function CommentItem({ comment }: { comment: BoomComment }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const avatarColor = comment.is_premium ? colors.accent : colors.primary;
  return (
    <View style={styles.comment}>
      <View style={styles.commentHeader}>
        <View style={[styles.avatar, { backgroundColor: `${avatarColor}2E`, borderColor: `${avatarColor}66` }]}>
          <AppText variant="small" style={{ color: avatarColor, fontWeight: '800' }}>
            {(comment.user_avatar || comment.user_name || 'T')[0].toUpperCase()}
          </AppText>
        </View>
        <AppText variant="small" style={{ fontWeight: '700', flex: 1 }}>{comment.user_name || t('components.boomCard.trader')}</AppText>
        {comment.is_premium ? <Badge color={colors.accent} bg={`${colors.accent}1F`}>{t('components.boomCard.pro')}</Badge> : null}
        <AppText variant="small" style={{ color: colors.textMuted }}>{timeAgo(comment.created_at)}</AppText>
      </View>
      {comment.text ? <AppText>{comment.text}</AppText> : null}
      {comment.audio_url ? <AudioPlayer uri={comment.audio_url} /> : null}
    </View>
  );
}

export function BoomCard({
  boom,
  comments,
  votes,
}: {
  boom: BoomTime;
  comments: BoomComment[];
  votes: BoomVote[];
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [pendingAudio, setPendingAudio] = useState<RecordedAudio | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const status = getBoomStatus(boom.boom_time);
  const live = status === 'live';
  const upcoming = status === 'upcoming';

  const buyCount = votes.filter((v) => v.vote === 'BUY').length;
  const sellCount = votes.filter((v) => v.vote === 'SELL').length;
  const total = buyCount + sellCount;
  const buyPct = total > 0 ? Math.round((buyCount / total) * 100) : 50;
  const myVote = user ? votes.find((v) => v.user_id === user.id)?.vote ?? null : null;

  const onVote = async (type: 'BUY' | 'SELL') => {
    if (!user || !boom.id) return;
    await castVote(boom.id, user.id, type, myVote);
  };

  const uploadAudio = async (audio: RecordedAudio): Promise<string | null> => {
    if (!user) return null;
    const ext = audio.uri.split('.').pop()?.toLowerCase() || (audio.mimeType.includes('webm') ? 'webm' : 'm4a');
    const path = `comments/${user.id}/${Date.now()}.${ext}`;
    setUploading(true);
    try {
      const file = new File(audio.uri);
      const { error } = await supabase.storage
        .from('comments-audio')
        .upload(path, file, { contentType: audio.mimeType || 'audio/m4a', upsert: false });
      if (error) {
        console.warn('[uploadAudio] Supabase error:', error.message);
        return null;
      }
      return supabase.storage.from('comments-audio').getPublicUrl(path).data.publicUrl;
    } catch (err: any) {
      console.warn('[uploadAudio] Exception:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const sendComment = async () => {
    if (!user || sending || uploading) return;
    if (!commentText.trim() && !pendingAudio) return;

    setSending(true);
    try {
      let audioUrl: string | null = null;
      if (pendingAudio) {
        audioUrl = await uploadAudio(pendingAudio);
        if (!audioUrl) return;
      }
      const name = displayName(user);
      const { error } = await supabase.from('boom_comments').insert({
        boom_id: boom.id,
        user_id: user.id,
        user_name: name,
        user_avatar: avatarLetter(user),
        text: commentText.trim(),
        audio_url: audioUrl,
        is_premium: isPremium,
      });
      if (!error) {
        setCommentText('');
        setPendingAudio(null);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Card style={styles.card}>
      {boom.image_url ? (
        <Image source={{ uri: boom.image_url }} style={styles.cover} resizeMode="cover" />
      ) : null}

      <View style={styles.topRow}>
        <StatusBadge boom={boom} />
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {formatDateTimeWAT(boom.boom_time)}
        </AppText>
      </View>

      <View style={styles.titleRow}>
        <AppText variant="h1">{boom.pair}</AppText>
        {live || upcoming ? <Countdown boomTime={boom.boom_time} /> : null}
      </View>

      <ConfidenceBar value={boom.confidence} />

      {boom.audio_url ? <AudioPlayer uri={boom.audio_url} /> : null}

      {!upcoming && !live && boom.result ? (
        <View style={styles.resultRow}>
          <Ionicons
            name={boom.result === 'BUY' ? 'trending-up' : boom.result === 'SELL' ? 'trending-down' : 'remove'}
            size={16}
            color={boom.result === 'BUY' ? colors.success : colors.destructive}
          />
          <AppText variant="label" style={{ color: boom.result === 'BUY' ? colors.success : colors.destructive }}>
            {boom.result}
          </AppText>
        </View>
      ) : null}

      <View style={styles.voteArea}>
        <View style={styles.voteRow}>
          <Pressable
            onPress={() => onVote('BUY')}
            style={[
              styles.voteButton,
              { backgroundColor: `${colors.success}1A`, borderColor: myVote === 'BUY' ? colors.success : 'transparent' },
            ]}>
            <Ionicons name="trending-up" size={16} color={colors.success} />
            <AppText variant="small" style={{ color: colors.success, fontWeight: '800' }}>
              {t('components.boomCard.buy', { pct: buyPct })}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => onVote('SELL')}
            style={[
              styles.voteButton,
              { backgroundColor: `${colors.destructive}1A`, borderColor: myVote === 'SELL' ? colors.destructive : 'transparent' },
            ]}>
            <Ionicons name="trending-down" size={16} color={colors.destructive} />
            <AppText variant="small" style={{ color: colors.destructive, fontWeight: '800' }}>
              {t('components.boomCard.sell', { pct: 100 - buyPct })}
            </AppText>
          </Pressable>
        </View>
        <View style={styles.voteTrack}>
          <View style={[styles.voteFill, { width: `${buyPct}%`, backgroundColor: colors.success }]} />
          <View style={[styles.voteFill, { width: `${100 - buyPct}%`, backgroundColor: colors.destructive }]} />
        </View>
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {t('components.boomCard.votes', { total, pct: buyPct })}
        </AppText>
      </View>

      <Pressable style={styles.commentsToggle} onPress={() => setExpanded(!expanded)}>
        <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.textMuted} />
        <AppText variant="small" style={{ color: colors.textMuted, fontWeight: '600' }}>
          {t('components.boomCard.comments', { count: comments.length })}
        </AppText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textMuted} />
      </Pressable>

      {expanded ? (
        <KeyboardAvoidingView behavior="padding">
          {comments.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </View>
          ) : (
            <AppText variant="muted">{t('components.boomCard.noComments')}</AppText>
          )}

          {user ? (
            <View style={styles.composer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={t('components.boomCard.commentPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.input}
              />
              <View style={styles.composerRow}>
                <AudioRecorderButton onRecorded={(a) => setPendingAudio(a)} compact />
                {pendingAudio ? (
                  <Pressable onPress={() => setPendingAudio(null)} style={styles.attachChip}>
                    <Ionicons name="musical-note" size={13} color={colors.primary} />
                    <AppText variant="small" style={{ color: colors.primary }}>{t('components.boomCard.audioAttached')}</AppText>
                  </Pressable>
                ) : null}
                <AppButton
                  title={t('components.boomCard.send')}
                  onPress={sendComment}
                  loading={sending || uploading}
                  disabled={!commentText.trim() && !pendingAudio}
                  style={{ marginLeft: 'auto', paddingVertical: 10 }}
                />
              </View>
            </View>
          ) : (
            <AppText variant="muted" style={{ marginTop: Spacing.md }}>
              {t('components.boomCard.loginToComment')}
            </AppText>
          )}
        </KeyboardAvoidingView>
      ) : null}
    </Card>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  card: { marginBottom: Spacing.lg, gap: Spacing.md },
  cover: { height: 160, borderRadius: 12, width: '100%' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countdown: { fontSize: 22, lineHeight: 30, color: c.accent, fontWeight: '700', letterSpacing: 1 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  voteArea: { gap: Spacing.sm },
  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  voteTrack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  voteFill: { height: '100%' },
  commentsToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  commentsList: { gap: Spacing.md },
  comment: {
    gap: Spacing.sm,
    backgroundColor: c.surfaceElevated,
    borderRadius: 12,
    padding: Spacing.md,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: { marginTop: Spacing.md, gap: Spacing.sm },
  input: {
    backgroundColor: c.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    color: c.text,
    minHeight: 44,
    maxHeight: 100,
  },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  attachChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
