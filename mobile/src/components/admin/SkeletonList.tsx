import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

interface SkeletonProps {
  count?: number;
  variant?: 'card' | 'row';
}

export function SkeletonList({ count = 5, variant = 'row' }: SkeletonProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (variant === 'card') {
    return (
      <View style={styles.cardGrid}>
        {Array.from({ length: count }).map((_, i) => (
          <Animated.View key={i} style={[styles.card, { opacity }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.row, { opacity }]}>
          <View style={styles.rowAvatar} />
          <View style={styles.rowContent}>
            <View style={styles.rowTitle} />
            <View style={styles.rowSubtitle} />
          </View>
          <View style={styles.rowAction} />
        </Animated.View>
      ))}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    cardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    card: {
      width: '47%',
      height: 80,
      backgroundColor: c.surface,
      borderRadius: Radius.md,
    },
    list: {
      gap: Spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    rowAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surfaceElevated,
    },
    rowContent: {
      flex: 1,
      gap: Spacing.xs,
    },
    rowTitle: {
      height: 14,
      width: '60%',
      backgroundColor: c.surfaceElevated,
      borderRadius: 4,
    },
    rowSubtitle: {
      height: 10,
      width: '40%',
      backgroundColor: c.surfaceElevated,
      borderRadius: 4,
    },
    rowAction: {
      width: 24,
      height: 24,
      borderRadius: 4,
      backgroundColor: c.surfaceElevated,
    },
  });
