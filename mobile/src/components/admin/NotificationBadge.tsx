import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

interface NotificationBadgeProps {
  count: number;
  onPress: () => void;
}

export function NotificationBadge({ count, onPress }: NotificationBadgeProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable onPress={onPress} style={styles.container} accessibilityRole="button" accessibilityLabel="Notifications">
      <Ionicons name="notifications-outline" size={22} color={colors.text} />
      {count > 0 && (
        <View style={styles.badge}>
          <AppText variant="small" style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { position: 'relative', padding: Spacing.xs },
    badge: {
      position: 'absolute', top: 0, right: 0,
      backgroundColor: c.destructive, borderRadius: 10,
      minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  });
