import { useCallback } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  SlideInRight,
  SlideInLeft,
  Layout,
  Easing,
  type AnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import { Pressable, type PressableProps, View } from 'react-native';

// ── Spring Configs ──────────────────────────────────────────────────────────

export const SPRING = {
  gentle: { damping: 15, stiffness: 120, mass: 0.8 },
  snappy: { damping: 20, stiffness: 200, mass: 0.6 },
  bouncy: { damping: 10, stiffness: 150, mass: 0.5 },
  slow: { damping: 12, stiffness: 80, mass: 1 },
} as const;

// ── Timing Configs ──────────────────────────────────────────────────────────

export const TIMING = {
  fast: { duration: 150 },
  normal: { duration: 300 },
  slow: { duration: 500 },
  verySlow: { duration: 800 },
} as const;

// ── Entrance Animations ─────────────────────────────────────────────────────

export const ANIM_PRESETS = {
  fadeIn: FadeIn.duration(400),
  fadeInDown: FadeInDown.duration(400).springify(),
  fadeInUp: FadeInUp.duration(400).springify(),
  slideInRight: SlideInRight.duration(300).springify(),
  slideInLeft: SlideInLeft.duration(300).springify(),
} as const;

// ── AnimatedPressable ───────────────────────────────────────────────────────
// Pressable with scale feedback

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  scaleTo?: number;
  haptic?: boolean;
}

export function AnimatedPressable({ children, scaleTo = 0.97, style, ...props }: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = useCallback(() => {
    'worklet';
    // eslint-disable-next-line react-hooks/immutability -- sharedValue.value = e a API documentada do Reanimated
    scale.value = withSpring(scaleTo, SPRING.snappy);
    // eslint-disable-next-line react-hooks/immutability -- sharedValue.value = e a API documentada do Reanimated
    opacity.value = withTiming(0.85, TIMING.fast);
  }, [scaleTo]);

  const onPressOut = useCallback(() => {
    'worklet';
    // eslint-disable-next-line react-hooks/immutability -- sharedValue.value = e a API documentada do Reanimated
    scale.value = withSpring(1, SPRING.gentle);
    // eslint-disable-next-line react-hooks/immutability -- sharedValue.value = e a API documentada do Reanimated
    opacity.value = withTiming(1, TIMING.fast);
  }, []);

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={style}
      {...props}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ── Pulse Animation ─────────────────────────────────────────────────────────

interface PulseProps {
  children: React.ReactNode;
  speed?: number;
  minOpacity?: number;
}

export function Pulse({ children, speed = 1200, minOpacity = 0.5 }: PulseProps) {
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const startPulse = useCallback(() => {
    'worklet';
    // eslint-disable-next-line react-hooks/immutability -- sharedValue.value = e a API documentada do Reanimated
    opacity.value = withRepeat(
      withSequence(
        withTiming(minOpacity, { duration: speed / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: speed / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [speed, minOpacity]);

  // Start on mount
  const onLayout = useCallback(() => {
    startPulse();
  }, [startPulse]);

  return (
    <Animated.View style={animatedStyle} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
}

// ── Shimmer Effect ──────────────────────────────────────────────────────────

interface ShimmerProps {
  children: React.ReactNode;
  duration?: number;
}

export function Shimmer({ children, duration = 2000 }: ShimmerProps) {
  const translateX = useSharedValue(-100);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const startShimmer = useCallback(() => {
    'worklet';
    // eslint-disable-next-line react-hooks/immutability -- sharedValue.value = e a API documentada do Reanimated
    translateX.value = withRepeat(
      withTiming(300, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [duration]);

  const onLayout = useCallback(() => {
    startShimmer();
  }, [startShimmer]);

  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, animatedStyle]}>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </Animated.View>
      <Animated.View onLayout={onLayout}>
        {children}
      </Animated.View>
    </View>
  );
}

// ── Scale Bounce ────────────────────────────────────────────────────────────

interface ScaleBounceProps {
  children: React.ReactNode;
  trigger: boolean;
}

export function ScaleBounce({ children, trigger }: ScaleBounceProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animate = useCallback(() => {
    'worklet';
    // eslint-disable-next-line react-hooks/immutability -- sharedValue.value = e a API documentada do Reanimated
    scale.value = withSequence(
      withSpring(1.15, SPRING.bouncy),
      withSpring(1, SPRING.gentle),
    );
  }, []);

  // Trigger effect
  if (trigger) {
    animate();
  }

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}

// ── Animated Number (count-up) ──────────────────────────────────────────────

export function useAnimatedNumber(target: number, duration = 1000) {
  const value = useSharedValue(0);

  const animate = useCallback(() => {
    'worklet';
    value.value = withTiming(target, { duration, easing: Easing.out(Easing.ease) });
  }, [target, duration]);

  return { value, animate };
}

// ── Fade In View ────────────────────────────────────────────────────────────

export { Animated, FadeIn, FadeInDown, FadeInUp, FadeOutUp, SlideInRight, SlideInLeft, Layout };
