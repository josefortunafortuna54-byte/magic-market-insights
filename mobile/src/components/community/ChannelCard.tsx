import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Channel } from '@/core/types';

const TILES: [string, string][] = [
  ['rgba(22,164,58,0.32)', 'rgba(22,164,58,0.10)'],
  ['rgba(255,159,10,0.30)', 'rgba(255,159,10,0.08)'],
  ['rgba(64,140,255,0.28)', 'rgba(48,209,88,0.08)'],
  ['rgba(255,69,58,0.24)', 'rgba(255,159,10,0.06)'],
  ['rgba(191,90,242,0.26)', 'rgba(22,164,58,0.08)'],
];

function tileFor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TILES[h % TILES.length];
}

export function ChannelCard({
  channel,
  index = 0,
  onPress,
}: {
  channel: Channel;
  index?: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const iconOk =
    !!channel.icon &&
    Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, channel.icon);
  const letter = channel.display_name.trim().charAt(0).toUpperCase() || '#';

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <LinearGradient colors={tileFor(channel.name)} style={styles.tile}>
          {iconOk ? (
            <Ionicons name={channel.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.text} />
          ) : (
            <AppText style={styles.tileLetter}>{letter}</AppText>
          )}
        </LinearGradient>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <AppText numberOfLines={1} style={styles.name}>
              {channel.display_name}
            </AppText>
            {channel.is_premium ? (
              <View style={styles.crownChip}>
                <Ionicons name="diamond" size={9} color={colors.accent} />
                <AppText variant="small" style={styles.crownText}>
                  PRO
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="small" numberOfLines={1} style={styles.desc}>
            {channel.description || t('workspace.channelNoDesc')}
          </AppText>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.sm + 2,
    },
    pressed: { backgroundColor: c.surfaceElevated, transform: [{ scale: 0.99 }] },
    tile: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileLetter: { color: c.text, fontWeight: '800', fontSize: 17 },
    info: { flex: 1, gap: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { color: c.text, fontWeight: '700', flexShrink: 1 },
    crownChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: `${c.accent}1A`,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    crownText: { color: c.accent, fontWeight: '800', fontSize: 9, letterSpacing: 0.5 },
    desc: { color: c.textMuted },
  });
