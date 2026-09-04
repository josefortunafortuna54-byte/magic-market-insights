import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Channel } from '@/core/types';

export function ChannelRow({ channel, onPress }: { channel: Channel; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons name="pricetag" size={16} color={colors.textMuted} />
      <AppText style={styles.label}>{channel.display_name}</AppText>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 8,
      borderRadius: 8,
    },
    label: { color: c.text, fontWeight: '600' },
  });
