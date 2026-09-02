import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from '@/components/ui';

let audioModeConfigured = false;
async function ensureAudioMode() {
  if (audioModeConfigured) return;
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  audioModeConfigured = true;
}

export interface RecordedAudio {
  uri: string;
  mimeType: string;
}

export function AudioRecorderButton({
  onRecorded,
  compact,
}: {
  onRecorded: (audio: RecordedAudio) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    await ensureAudioMode();
    if (state.isRecording) {
      setBusy(true);
      await recorder.stop();
      setBusy(false);
      const uri = recorder.uri;
      if (uri) {
        const isWebm = uri.endsWith('.webm');
        onRecorded({ uri, mimeType: isWebm ? 'audio/webm' : 'audio/mp4' });
      }
    } else {
      setBusy(true);
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setBusy(false);
        return;
      }
      await recorder.prepareToRecordAsync();
      setBusy(false);
      recorder.record();
    }
  };

  const seconds = state.isRecording ? Math.floor(state.durationMillis / 1000) : 0;

  return (
    <Pressable
      onPress={toggle}
      disabled={busy}
      style={[styles.button, state.isRecording && styles.recording, compact && styles.compact]}>
      <Ionicons
        name={state.isRecording ? 'stop' : 'mic'}
        size={compact ? 16 : 18}
        color={state.isRecording ? '#fff' : colors.text}
      />
      <AppText variant="small" style={{ color: state.isRecording ? '#fff' : colors.text, fontWeight: '700' }}>
        {state.isRecording ? t('components.audioRecorder.stop', { seconds }) : t('components.audioRecorder.audio')}
      </AppText>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: c.surfaceElevated,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  compact: { paddingVertical: 8, paddingHorizontal: 10 },
  recording: { backgroundColor: c.destructive, borderColor: c.destructive },
});
