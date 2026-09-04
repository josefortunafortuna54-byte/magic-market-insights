import { Image, Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const HIDDEN_PREFIXES = ['/(auth)', '/login', '/whatsapp', '/suporte-ia'];
const STORAGE_KEY = 'tmt_ai_fab_y';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FAB_SIZE = 40;
const FAB_MARGIN = 12;
const IDLE_OPACITY = 0.55;

export function AiFab() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathname = usePathname();

  const y = useSharedValue(SCREEN_HEIGHT - 110);
  const float = useSharedValue(0);
  const [ready, setReady] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1300 }),
        withTiming(5, { duration: 1300 }),
      ),
      -1,
      true,
    );
  }, [float]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v !== null) {
        const parsed = Number(v);
        if (!isNaN(parsed)) y.value = parsed;
      }
      setReady(true);
    });
  }, []);

  const saveY = (val: number) => {
    AsyncStorage.setItem(STORAGE_KEY, String(val));
  };

  const onGestureEvent = (e: any) => {
    const newY = y.value + e.changeY;
    const min = 80;
    const max = SCREEN_HEIGHT - FAB_SIZE - FAB_MARGIN - 80;
    // eslint-disable-next-line react-hooks/immutability -- sharedValue.value = e a API documentada do Reanimated
    y.value = Math.min(max, Math.max(min, newY));
  };

  const onHandlerStateChange = (e: any) => {
    if (e.oldState === State.ACTIVE) {
      saveY(y.value);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value + float.value }],
    opacity: pressed ? 1 : IDLE_OPACITY,
  }));

  if (!user) return null;
  if (pathname === '/' || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!ready) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}>
        <Animated.View style={[styles.wrap, animatedStyle]}>
          <Pressable
            onPress={() => router.push('/suporte-ia')}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('components.aiFab.label')}>
            <Image
              source={require('@/assets/images/ia.png')}
              style={styles.fabIcon}
              resizeMode="contain"
            />
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  wrap: {
    position: 'absolute',
    right: FAB_MARGIN,
    zIndex: 50,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.92 }] },
  fabIcon: { width: 28, height: 28 },
});
