import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { uploadCommunityImage } from '@/lib/community';
import type { UserProfile } from '@/core/types';

export function Composer({
  onSend,
  disabled,
  placeholder,
  profiles,
  currentUserId,
  initialImageUri,
}: {
  onSend: (text: string, imageUrl?: string | null, mentionIds?: string[]) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  profiles: Record<string, UserProfile>;
  currentUserId: string | null;
  initialImageUri?: string | null;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [text, setText] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(() => {
    if (initialImageUri) {
      const ext = (initialImageUri.split('.').pop() || 'jpg').toLowerCase();
      return { uri: initialImageUri, name: `img-${Date.now()}.${ext}`, type: `image/${ext}` };
    }
    return null;
  });
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const activeMention = useMemo(() => {
    const before = text.slice(0, selection.start);
    const at = before.lastIndexOf('@');
    if (at < 0) return null;
    if (at > 0 && !/\s/.test(before[at - 1])) return null;
    const after = text.slice(at + 1);
    if (/\s/.test(after)) return null;
    return { at, query: after.toLowerCase() };
  }, [text, selection]);

  const suggestions = useMemo(() => {
    if (!activeMention) return [];
    const q = activeMention.query;
    return Object.values(profiles)
      .filter((p) => p.user_id !== currentUserId)
      .filter((p) => p.display_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [activeMention, profiles, currentUserId]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    setImage({
      uri: asset.uri,
      name: `img-${Date.now()}.${ext}`,
      type: asset.mimeType || `image/${ext}`,
    });
  };

  const selectMention = (p: UserProfile) => {
    if (!activeMention) return;
    const inserted = `${text.slice(0, activeMention.at)}@${p.display_name} ${text.slice(selection.start)}`;
    setText(inserted);
    const caret = inserted.length;
    setSelection({ start: caret, end: caret });
    setMentionIds((prev) => (prev.includes(p.user_id) ? prev : [...prev, p.user_id]));
  };

  const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSelection(e.nativeEvent.selection);
  };

  const send = async () => {
    if (!user || sending || uploading || disabled) return;
    if (!text.trim() && !image) return;
    setSending(true);
    let imageUrl: string | null = null;
    if (image) {
      setUploading(true);
      imageUrl = await uploadCommunityImage(user.id, image.uri, image.type);
      setUploading(false);
      if (!imageUrl) {
        setSending(false);
        Alert.alert(
          t('workspace.imageUploadFailedTitle'),
          t('workspace.imageUploadFailedBody'),
        );
        return;
      }
    }
    const trimmed = text.trim();
    const validMentions = mentionIds.filter((id) => {
      const name = profiles[id]?.display_name;
      return !!name && trimmed.includes(`@${name}`);
    });
    await onSend(trimmed, imageUrl, validMentions);
    setText('');
    setImage(null);
    setMentionIds([]);
    setSending(false);
  };

  return (
    <View style={styles.composer}>
      {activeMention && suggestions.length > 0 ? (
        <View style={styles.mentionPanel}>
          <AppText variant="small" style={styles.mentionHeader}>
            {t('workspace.mentionHeader')}
          </AppText>
          <ScrollView style={styles.mentionScroll} keyboardShouldPersistTaps="handled">
            {suggestions.map((p) => (
              <Pressable
                key={p.user_id}
                onPress={() => selectMention(p)}
                style={styles.mentionRow}>
                <UserAvatar name={p.display_name} avatarUrl={p.avatar_url} role={p.role} size={28} />
                <AppText variant="small" style={styles.mentionName} numberOfLines={1}>
                  {p.display_name}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {image ? (
        <View style={styles.attachRow}>
          <Image source={{ uri: image.uri }} style={styles.thumb} />
          <Pressable onPress={() => setImage(null)} style={styles.remove}>
            <Ionicons name="close" size={14} color={colors.text} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.row}>
        <Pressable onPress={pickImage} style={styles.iconBtn} disabled={uploading}>
          <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          onSelectionChange={onSelectionChange}
          placeholder={placeholder || t('workspace.composerPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
        />
        <AppButton
          title={t('common.send')}
          onPress={send}
          loading={sending || uploading}
          disabled={(!text.trim() && !image) || disabled}
          style={styles.sendBtn}
        />
      </View>
      {uploading ? (
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {t('workspace.uploadingImage')}
        </AppText>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    composer: { paddingTop: Spacing.sm, gap: Spacing.sm },
    mentionPanel: {
      backgroundColor: c.surfaceElevated,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      maxHeight: 220,
    },
    mentionHeader: { color: c.textMuted, fontWeight: '700', marginBottom: Spacing.xs },
    mentionScroll: { maxHeight: 160 },
    mentionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 6,
      paddingHorizontal: Spacing.xs,
    },
    mentionName: { fontWeight: '600', flex: 1 },
    attachRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    thumb: { width: 64, height: 64, borderRadius: Radius.sm },
    remove: {
      position: 'absolute',
      top: 4,
      left: 48,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
    iconBtn: { paddingBottom: 10 },
    input: {
      flex: 1,
      backgroundColor: c.surfaceElevated,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
      minHeight: 42,
      maxHeight: 100,
    },
    sendBtn: { paddingVertical: 10, paddingHorizontal: 18 },
  });
