import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from '@/components/ui';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AudioPlayer({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const player = useAudioPlayer(uri || null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const duration = status.duration || 0;
  const current = Math.min(status.currentTime || 0, duration);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={toggle} style={styles.playButton} hitSlop={8}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color="#fff" />
      </Pressable>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: duration > 0 ? `${(current / duration) * 100}%` : '0%' },
          ]}
        />
      </View>
      <AppText variant="small" style={styles.time}>
        {formatTime(current)} / {formatTime(duration)}
      </AppText>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: c.surfaceElevated,
    borderRadius: 10,
    padding: 8,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: c.primary },
  time: { color: c.textMuted, minWidth: 72, textAlign: 'right' },
});
