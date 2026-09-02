import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Dimensions, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { Spacing, Radius, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const makeToastConfig = (c: Palette): Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string }> => ({
  success: { icon: 'checkmark-circle', color: c.success },
  error: { icon: 'close-circle', color: c.destructive },
  warning: { icon: 'warning', color: c.warning },
  info: { icon: 'information-circle', color: c.primary },
});

export function Toast({ toast, onDismiss }: ToastProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [translateY] = useState(() => new Animated.Value(-100));
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateX] = useState(() => new Animated.Value(0));
  const config = makeToastConfig(colors)[toast.type];

  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 100) {
          Animated.timing(translateX, {
            toValue: gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDismiss(toast.id));
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss(toast.id));
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }, { translateX }], opacity, backgroundColor: config.color }]}
      {...panResponder.panHandlers}
    >
      <Pressable onPress={() => onDismiss(toast.id)} style={styles.content}>
        <Ionicons name={config.icon} size={20} color="#FFFFFF" />
        <AppText variant="small" style={styles.message} numberOfLines={2}>
          {toast.message}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 60,
      left: Spacing.md,
      right: Spacing.md,
      zIndex: 9999,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    message: { color: '#FFFFFF', flex: 1 },
  });
