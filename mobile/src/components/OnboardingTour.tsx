import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { getTourTarget } from '@/components/tour/registry';
import { useTranslation } from 'react-i18next';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourStep {
  route: string;
  targetId: string;
  title: string;
  desc: string;
}

const PAD = 10;
const TOOLTIP_EST = 150;
const ARROW = 12;

function measureTarget(id: string, retries = 25): Promise<Rect | null> {
  return new Promise((resolve) => {
    const attempt = (left: number) => {
      const ref = getTourTarget(id);
      if (ref?.current) {
        ref.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) resolve({ x, y, width, height });
          else if (left > 0) setTimeout(() => attempt(left - 1), 120);
          else resolve(null);
        });
      } else if (left > 0) {
        setTimeout(() => attempt(left - 1), 120);
      } else {
        resolve(null);
      }
    };
    attempt(retries);
  });
}

export function OnboardingTour() {
  const { t } = useTranslation();
  const { showTour, completeTour } = useOnboarding();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const pathname = usePathname();
  const { width: winW, height: winH } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipH, setTooltipH] = useState(TOOLTIP_EST);

  const steps = useMemo<TourStep[]>(
    () => [
      {
        route: '/(tabs)/inicio',
        targetId: 'tour:inicio-performance',
        title: t('tour.step1Title'),
        desc: t('tour.step1Desc'),
      },
      {
        route: '/(tabs)/analises',
        targetId: 'tour:analises-title',
        title: t('tour.step2Title'),
        desc: t('tour.step2Desc'),
      },
      {
        route: '/(tabs)/horarios',
        targetId: 'tour:horarios-title',
        title: t('tour.step3Title'),
        desc: t('tour.step3Desc'),
      },
      {
        route: '/(tabs)/perfil',
        targetId: 'tour:perfil-wallet',
        title: t('tour.step4Title'),
        desc: t('tour.step4Desc'),
      },
      {
        route: '/(tabs)/comunidade',
        targetId: 'tour:comunidade-search',
        title: t('tour.step5Title'),
        desc: t('tour.step5Desc'),
      },
      {
        route: '/diario-trader',
        targetId: 'tour:diario-title',
        title: t('tour.step6Title'),
        desc: t('tour.step6Desc'),
      },
    ],
    [t],
  );

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  useEffect(() => {
    if (!showTour) return;
    let cancelled = false;

    if (pathname !== step.route) {
      router.push(step.route as Href);
    }

    const timer = setTimeout(() => {
      measureTarget(step.targetId).then((r) => {
        if (cancelled) return;
        setRect(r);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showTour, stepIndex, step.route, step.targetId, pathname, router]);

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      completeTour();
      return;
    }
    setRect(null);
    setStepIndex((i) => i + 1);
  }, [stepIndex, steps.length, completeTour]);

  const skip = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const onTooltipLayout = useCallback((e: LayoutChangeEvent) => {
    setTooltipH(e.nativeEvent.layout.height);
  }, []);

  if (!showTour) return null;

  const spotlight = rect
    ? {
        x: Math.max(PAD, rect.x - PAD),
        y: Math.max(PAD, rect.y - PAD),
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  const tooltipWidth = Math.min(winW - 40, 360);
  const rawTipLeft = spotlight
    ? spotlight.x + spotlight.width / 2 - tooltipWidth / 2
    : (winW - tooltipWidth) / 2;
  const tipLeft = Math.max(16, Math.min(winW - tooltipWidth - 16, rawTipLeft));

  const placeBelow = spotlight ? spotlight.y + spotlight.height + tooltipH + 48 < winH : true;
  const rawTipTop = spotlight
    ? placeBelow
      ? spotlight.y + spotlight.height + 12
      : spotlight.y - tooltipH - 12
    : (winH - tooltipH) / 2;
  const tipTop = Math.max(12, Math.min(winH - tooltipH - 12, rawTipTop));

  const arrowLeft = spotlight
    ? Math.min(Math.max(spotlight.x + spotlight.width / 2 - tipLeft - ARROW / 2, 24), tooltipWidth - 24)
    : tooltipWidth / 2 - ARROW / 2;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={skip}>
      <View style={styles.fill}>
        {spotlight ? (
          <>
            <Pressable style={[styles.dim, { top: 0, left: 0, right: 0, height: spotlight.y }]} onPress={next} />
            <Pressable style={[styles.dim, { top: spotlight.y + spotlight.height, left: 0, right: 0, bottom: 0 }]} onPress={next} />
            <Pressable style={[styles.dim, { top: spotlight.y, left: 0, width: spotlight.x, height: spotlight.height }]} onPress={next} />
            <Pressable style={[styles.dim, { top: spotlight.y, left: spotlight.x + spotlight.width, right: 0, height: spotlight.height }]} onPress={next} />
            <View
              pointerEvents="none"
              style={[
                styles.spot,
                { left: spotlight.x, top: spotlight.y, width: spotlight.width, height: spotlight.height },
              ]}
            />
          </>
        ) : (
          <Pressable style={[styles.dim, StyleSheet.absoluteFill]} onPress={next} />
        )}

        <View
          onLayout={onTooltipLayout}
          style={[
            styles.tooltip,
            { width: tooltipWidth, left: tipLeft, top: tipTop },
          ]}>
          {spotlight ? (
            <View
              pointerEvents="none"
              style={[
                styles.arrow,
                placeBelow ? styles.arrowUp : styles.arrowDown,
                { left: arrowLeft },
              ]}
            />
          ) : null}
          <AppText variant="h2" style={styles.tooltipTitle}>{step.title}</AppText>
          <AppText style={styles.tooltipDesc}>{step.desc}</AppText>
          <View style={styles.tooltipFooter}>
            <Pressable onPress={skip} hitSlop={8} style={styles.skipBtn}>
              <AppText variant="small" style={styles.skipText}>{t('tour.skip')}</AppText>
            </Pressable>
            <AppButton
              title={isLast ? t('tour.finish') : t('tour.next')}
              onPress={next}
              style={styles.nextBtn}
              icon={<Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#FFFFFF" />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  fill: { flex: 1 },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  spot: {
    position: 'absolute',
    borderColor: c.primary,
    borderWidth: 2,
    borderRadius: Radius.lg,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: c.surfaceElevated,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 12,
  },
  arrow: {
    position: 'absolute',
    width: ARROW,
    height: ARROW,
    backgroundColor: c.surfaceElevated,
    transform: [{ rotate: '45deg' }],
  },
  arrowUp: { top: -ARROW / 2 },
  arrowDown: { bottom: -ARROW / 2 },
  tooltipTitle: { color: c.text },
  tooltipDesc: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  tooltipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  skipBtn: { paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
  skipText: { color: c.textMuted, fontWeight: '700' },
  nextBtn: { minHeight: 46, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg },
});
