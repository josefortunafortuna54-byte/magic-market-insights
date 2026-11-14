import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ImageBackground, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getOAuthErrorParams } from '@/lib/googleAuth';

export default function SplashScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [oauthError] = useState(() => getOAuthErrorParams().error);
  const [animationDone, setAnimationDone] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setAnimationDone(true));
    return () => opacity.stopAnimation();
  }, [opacity]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => router.replace('/(tabs)/inicio'), 300);
    return () => clearTimeout(timer);
  }, [user, router]);

  useEffect(() => {
    if (initializing || user || !animationDone) return;
    const timer = setTimeout(
      () => router.replace({ pathname: '/(auth)/login', params: oauthError ? { oauthError } : {} }),
      600,
    );
    return () => clearTimeout(timer);
  }, [animationDone, initializing, user, router, oauthError]);

  return (
    <ImageBackground
      source={require('@/assets/images/bg-splash.png')}
      style={styles.container}
      resizeMode="contain">
      <Animated.View style={[styles.loadingOverlay, { opacity }]}>
        <ActivityIndicator size="large" color="#00c853" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050D', alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: {
    position: 'absolute',
    bottom: '18%',
    alignItems: 'center',
  },
  loadingText: {
    color: '#a0a0a0',
    fontSize: 14,
    marginTop: 8,
  },
});
