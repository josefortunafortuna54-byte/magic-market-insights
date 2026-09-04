import { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import type { Announcement } from '@/core/types';

const AUTOPLAY_MS = 5000;

export function AnnouncementCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { announcements } = useAnnouncements();
  const listRef = useRef<FlatList<Announcement> | null>(null);
  const indexRef = useRef(0);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = announcements.length;

  // Reset to the first slide whenever data or measured width changes.
  const [resetKey, setResetKey] = useState('');
  const nextResetKey = `${count}-${width}`;
  if (resetKey !== nextResetKey) {
    setResetKey(nextResetKey);
    setIndex(0);
  }

  useEffect(() => {
    indexRef.current = 0;
    if (width > 0) listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [resetKey, width]);

  useEffect(() => {
    if (paused || count <= 1 || width === 0) return;
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % count;
      indexRef.current = next;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, count, width]);

  if (count === 0) return null;

  const openLink = (ad: Announcement) => {
    if (!ad.link) return;
    if (ad.link.startsWith('/')) {
      // @ts-expect-error rota dinâmica gerida pelos admins
      router.push(ad.link);
      return;
    }
    Linking.openURL(ad.link).catch(() => {});
  };

  const ctaFor = (ad: Announcement) => (
    <View style={styles.cta}>
      <AppText variant="small" style={styles.ctaText} numberOfLines={1}>
        {ad.link_label || t('inicio.announceCta')}
      </AppText>
      <Ionicons name="chevron-forward" size={13} color="#0A0A0A" />
    </View>
  );

  const renderSlide = ({ item }: { item: Announcement }) => {
    const content = (
      <>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        <LinearGradient
          colors={item.image_url ? ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)'] : [colors.primaryDim, 'rgba(22,164,58,0.22)']}
          start={{ x: 0, y: 0 }}
          end={item.image_url ? { x: 1, y: 0 } : { x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.row, !item.image_url && styles.plainBorder]}>
          <View style={styles.iconWrap}>
            <Ionicons name="megaphone" size={20} color={colors.success} />
          </View>
          <View style={styles.textWrap}>
            <AppText variant="label" numberOfLines={1}>{item.title}</AppText>
            {item.body ? (
              <AppText variant="small" style={styles.body} numberOfLines={2}>
                {item.body}
              </AppText>
            ) : null}
          </View>
          {item.link ? ctaFor(item) : null}
        </View>
      </>
    );

    if (item.link) {
      return (
        <Pressable
          onPress={() => openLink(item)}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}>
          {content}
        </Pressable>
      );
    }

    return <View style={{ width }}>{content}</View>;
  };

  return (
    <View style={styles.wrapper} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.banner, !announcements[0]?.image_url && styles.plainBg]}>
        <FlatList
          ref={listRef}
          data={announcements}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScrollBeginDrag={() => setPaused(true)}
          onMomentumScrollEnd={(e) => {
            setPaused(false);
            if (width > 0) {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              indexRef.current = i;
              setIndex(i);
            }
          }}
        />
        {count > 1 ? (
          <View pointerEvents="none" style={styles.dots}>
            {announcements.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  banner: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  plainBg: {
    backgroundColor: c.surface,
  },
  plainBorder: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${c.success}1F`,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  body: {
    color: c.textMuted,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: c.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 130,
  },
  ctaText: {
    color: '#0A0A0A',
    fontWeight: '800',
  },
  dots: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 14,
    backgroundColor: c.accent,
  },
});
