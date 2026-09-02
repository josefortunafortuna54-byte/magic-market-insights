import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import type { Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

export function UserAvatar({
  name,
  avatarUrl,
  role,
  size = 30,
  online,
  onPress,
  style,
}: {
  name: string;
  avatarUrl?: string | null;
  role?: 'admin' | 'member';
  size?: number;
  online?: boolean;
  onPress?: () => void;
  style?: object;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const color = role === 'admin' ? colors.accent : colors.primary;
  const radius = size / 2;

  const inner = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={{ width: size, height: size, borderRadius: radius }}
      resizeMode="cover"
    />
  ) : (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius, backgroundColor: `${color}2E` },
      ]}>
      <AppText variant="small" style={{ color, fontWeight: '800', fontSize: Math.round(size * 0.4) }}>
        {(name || 'T')[0].toUpperCase()}
      </AppText>
    </View>
  );

  const content = (
    <View style={[styles.wrap, style]}>
      {inner}
      {online ? <View style={[styles.dot, { borderColor: colors.bg }]} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }
  return content;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {},
    circle: { alignItems: 'center', justifyContent: 'center' },
    dot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: c.success,
      borderWidth: 2,
    },
  });
