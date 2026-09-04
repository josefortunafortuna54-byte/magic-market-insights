import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

export function CommunityHero({
  channelsCount,
  liveRooms,
}: {
  channelsCount: number;
  liveRooms: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <LinearGradient
      colors={['rgba(22,164,58,0.20)', 'rgba(255,159,10,0.08)', 'rgba(28,28,30,0.4)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}>
      <View style={styles.glowOne} pointerEvents="none" />
      <View style={styles.glowTwo} pointerEvents="none" />

      <View style={styles.topRow}>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <AppText variant="small" style={styles.liveText}>
            {t('workspace.liveBadge')}
          </AppText>
        </View>
      </View>

      <AppText variant="h1" style={styles.title}>
        {t('workspace.heroTitle')}
      </AppText>
      <AppText variant="small" style={styles.subtitle}>
        {t('workspace.heroSubtitle')}
      </AppText>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <AppText variant="label" style={styles.statValue}>{channelsCount}</AppText>
          <AppText variant="small" style={styles.statLabel}>
            {t('workspace.statsChannels', { count: channelsCount })}
          </AppText>
        </View>
        <View style={[styles.statChip, liveRooms > 0 && styles.statChipLive]}>
          <AppText variant="label" style={liveRooms > 0 ? styles.statValueLive : styles.statValue}>
            {liveRooms}
          </AppText>
          <AppText variant="small" style={styles.statLabel}>
            {t('workspace.statsRooms', { count: liveRooms })}
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hero: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: 'rgba(22,164,58,0.35)',
      padding: Spacing.lg,
      overflow: 'hidden',
      marginBottom: Spacing.md,
    },
    glowOne: {
      position: 'absolute',
      top: -70,
      right: -50,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(48,209,88,0.14)',
    },
    glowTwo: {
      position: 'absolute',
      bottom: -80,
      left: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,159,10,0.10)',
    },
    topRow: { flexDirection: 'row', marginBottom: Spacing.sm },
    liveChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.liveDim,
      borderColor: `${c.live}55`,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.live,
    },
    liveText: { color: c.live, fontWeight: '800', letterSpacing: 1 },
    title: { marginBottom: 2 },
    subtitle: { color: c.textMuted },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    statChip: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statChipLive: { borderColor: `${c.live}66` },
    statValue: { color: c.text, fontWeight: '800' },
    statValueLive: { color: c.live, fontWeight: '800' },
    statLabel: { color: c.textMuted },
  });
