import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { askAssistant, type AiMessage } from '@/lib/aiSupport';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'tmt_ai_chat';

const SUGGESTIONS = [
  'suporteIa.suggestion1',
  'suporteIa.suggestion2',
  'suporteIa.suggestion3',
  'suporteIa.suggestion4',
] as const;

const AI_GRAD_TINT = 'rgba(22,164,58,0.55)';

function isAiMessage(v: unknown): v is AiMessage {
  return (
    !!v &&
    typeof v === 'object' &&
    ('text' in v) &&
    typeof (v as AiMessage).text === 'string' &&
    ((v as AiMessage).role === 'user' || (v as AiMessage).role === 'model')
  );
}

export default function SuporteIaScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const aiColors: [string, string] = [colors.primary, AI_GRAD_TINT];
  const router = useRouter();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const listRef = useRef<FlatList<AiMessage>>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setMessages(parsed.filter(isAiMessage).slice(-40));
      } catch {}
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
  }, [messages]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, sending, scrollToEnd]);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || sending) return;
      setInput('');
      setError(null);
      const next: AiMessage[] = [...messages, { role: 'user', text }];
      setMessages(next);
      setSending(true);
      const result = await askAssistant(next);
      if (result.error) {
        setError(result.error);
      } else {
        setMessages([...next, { role: 'model', text: result.reply }]);
        setRemaining(result.remainingChat ?? null);
      }
      setSending(false);
    },
    [input, sending, messages],
  );

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <LinearGradient colors={[colors.bg, colors.bg, colors.bg]} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.flex}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('suporteIa.close')}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <LinearGradient colors={aiColors} style={styles.logoGlow}>
              <Ionicons name="sparkles" size={22} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.headerText}>
              <AppText variant="h2">{t('suporteIa.title')}</AppText>
              {remaining !== null ? (
                <AppText variant="small" style={{ color: colors.textMuted }}>
                  {t('suporteIa.remainingChat', { count: remaining })}
                </AppText>
              ) : (
                <AppText variant="small" style={{ color: colors.textMuted }}>
                  {t('suporteIa.subtitle')}
                </AppText>
              )}
            </View>
            <Pressable
              onPress={clearChat}
              hitSlop={10}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('suporteIa.clear')}>
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => `${i}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              messages.length === 0 ? (
                <View style={styles.welcome}>
                  <AppText variant="h1" style={styles.welcomeTitle}>{t('suporteIa.welcome')}</AppText>
                  <AppText variant="muted" style={styles.welcomeSub}>
                    {t('suporteIa.welcomeDesc')}
                  </AppText>
                  <View style={styles.suggestions}>
                    {SUGGESTIONS.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => send(s)}
                        disabled={sending}
                        style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}>
                        <AppText variant="small" style={{ color: colors.primary, fontWeight: '600' }}>
                          {t(s)}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <MessageBubble item={item} isLast={index === messages.length - 1} />
            )}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.destructive} />
              <AppText variant="small" style={styles.errorText}>{error}</AppText>
            </View>
          ) : null}

          {sending ? (
            <View style={styles.typingRow}>
              <LinearGradient colors={aiColors} style={styles.typingAvatar}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('suporteIa.placeholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={() => send()}
            />
            <Pressable
              onPress={() => send()}
              disabled={!input.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel={t('suporteIa.send')}
              style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function MessageBubble({ item, isLast }: { item: AiMessage; isLast: boolean }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const aiColors: [string, string] = [colors.primary, AI_GRAD_TINT];
  const isUser = item.role === 'user';
  if (isUser) {
    return (
      <View style={[styles.bubbleRow, styles.userRow]}>
        <View style={styles.userBubble}>
          <AppText style={styles.userText}>{item.text}</AppText>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.bubbleRow, styles.modelRow]}>
      <LinearGradient colors={aiColors} style={styles.modelAvatar}>
        <Ionicons name="sparkles" size={13} color="#FFFFFF" />
      </LinearGradient>
      <View style={[styles.modelBubble, isLast && styles.modelBubbleLast]}>
        <AppText style={styles.modelText}>{item.text}</AppText>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: Spacing.xs },
  logoGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
  welcome: { paddingVertical: Spacing.lg, gap: Spacing.sm },
  welcomeTitle: { fontSize: 20 },
  welcomeSub: { lineHeight: 20 },
  suggestions: { marginTop: Spacing.sm, gap: Spacing.sm },
  suggestion: {
    backgroundColor: c.surface,
    borderColor: 'rgba(22,164,58,0.35)',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  userRow: { justifyContent: 'flex-end' },
  modelRow: { justifyContent: 'flex-start' },
  userBubble: {
    backgroundColor: c.primary,
    borderRadius: Radius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '78%',
  },
  userText: { color: '#FFFFFF', lineHeight: 20 },
  modelAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelBubble: {
    backgroundColor: c.surfaceElevated,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '78%',
  },
  modelBubbleLast: { borderBottomLeftRadius: Radius.lg },
  modelText: { color: c.textBody, lineHeight: 20 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingBubble: {
    backgroundColor: c.surfaceElevated,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minWidth: 56,
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  errorText: { color: c.destructive, flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopColor: c.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: c.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
