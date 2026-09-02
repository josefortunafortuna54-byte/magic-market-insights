import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

const BAR_HEIGHT = 48;

export function AppHeader({
  back,
  onBack,
  title,
  headerRight,
}: {
  back?: boolean;
  onBack?: () => void;
  title?: string;
  headerRight?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      <View style={styles.bar}>
        {back ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={styles.left}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.left} />
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>{headerRight}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    width: 56,
    paddingLeft: 4,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  right: {
    width: 56,
    paddingRight: 12,
    alignItems: 'flex-end',
  },
});
