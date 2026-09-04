import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, EmptyState, Screen } from '@/components/ui';
import { Animated, AnimatedPressable, FadeInDown } from '@/lib/animations';
import { useSubscription } from '@/hooks/useSubscription';
import { useStoreProducts, type StoreCategory, type StoreProduct } from '@/hooks/useStoreProducts';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing, type Palette } from '@/core/theme';

type Category = 'all' | StoreCategory;

const CATEGORY_ACCENT: Record<StoreCategory, string> = {
  bots: '#30D158',
  mentorias: '#FF9F0A',
  ebooks: '#64D2FF',
};

const CATEGORY_ICON: Record<StoreCategory, keyof typeof Ionicons.glyphMap> = {
  bots: 'hardware-chip-outline',
  mentorias: 'people-outline',
  ebooks: 'book-outline',
};

const CATEGORIES: {
  key: Category;
  labelKey: 'store.categoryAll' | 'store.categoryBots' | 'store.categoryMentorias' | 'store.categoryEbooks';
}[] = [
  { key: 'all', labelKey: 'store.categoryAll' },
  { key: 'bots', labelKey: 'store.categoryBots' },
  { key: 'mentorias', labelKey: 'store.categoryMentorias' },
  { key: 'ebooks', labelKey: 'store.categoryEbooks' },
];

const INCLUDED_KEYS = {
  bots: ['store.incBot1', 'store.incBot2', 'store.incBot3'],
  mentorias: ['store.incMentor1', 'store.incMentor2', 'store.incMentor3'],
  ebooks: ['store.incEbook1', 'store.incEbook2', 'store.incEbook3'],
} as const;

export default function LojaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { isPremium } = useSubscription();
  const { products, refresh } = useStoreProducts();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedItem, setSelectedItem] = useState<StoreProduct | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  const stats = useMemo(() => {
    const total = products.length;
    const free = products.filter((i) => !i.isPremium).length;
    const ratingSum = products.reduce((acc, i) => acc + (i.rating ?? 0), 0);
    const rating = total > 0 ? ratingSum / total : 0;
    return { total, free, rating: rating.toFixed(1) };
  }, [products]);

  const filteredItems =
    selectedCategory === 'all'
      ? products
      : products.filter((item) => item.category === selectedCategory);

  const featuredItems = products.filter((item) => item.featured);

  const gap = Spacing.sm;
  // Grid lives inside Screen (padding 20) + section (paddingHorizontal md).
  const gridInset = 20 + Spacing.md;
  const cardWidth = (width - gridInset * 2 - gap) / 2;
  const featuredWidth = Math.min(width - Spacing.xl, 340);

  const isLocked = (item: StoreProduct) => item.isPremium && !isPremium;

  const closeItem = () => setSelectedItem(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleCta = () => {
    if (!selectedItem) return;
    const locked = isLocked(selectedItem);
    closeItem();
    router.push(locked ? '/planos' : '/suporte-ia');
  };

  const renderPrice = (item: StoreProduct, locked: boolean) =>
    item.isPremium || locked ? (
      <AppText variant="label" style={styles.pricePaid}>
        {item.price}
      </AppText>
    ) : (
      <AppText variant="label" style={styles.priceFree}>
        {t('store.free')}
      </AppText>
    );

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing.xl * 3 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient
            colors={['rgba(255,159,10,0.14)', 'rgba(22,164,58,0.08)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Ionicons name="storefront" size={22} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <AppText variant="h2">{t('store.title')}</AppText>
                <AppText variant="small" style={styles.heroSubtitle} numberOfLines={2}>
                  {t('store.subtitle')}
                </AppText>
              </View>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroStatValue}>{stats.total}</AppText>
                <AppText variant="small" style={styles.heroStatLabel}>{t('store.statsProducts')}</AppText>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroStatValue}>{stats.free}</AppText>
                <AppText variant="small" style={styles.heroStatLabel}>{t('store.statsFree')}</AppText>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <View style={styles.heroRatingValue}>
                  <Ionicons name="star" size={14} color={colors.accent} />
                  <AppText variant="h2" style={styles.heroStatValue}>{stats.rating}</AppText>
                </View>
                <AppText variant="small" style={styles.heroStatLabel}>{t('store.statsRating')}</AppText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {featuredItems.length > 0 && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <View style={[styles.sectionHeader, { paddingHorizontal: Spacing.md, marginTop: Spacing.md }]}>
              <Ionicons name="star" size={14} color={colors.accent} />
              <AppText variant="label" style={styles.sectionTitle}>{t('store.featuredSection')}</AppText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={featuredWidth + gap}
              contentContainerStyle={{ gap, paddingHorizontal: Spacing.md }}
            >
              {featuredItems.map((item) => {
                const accent = item.color ?? CATEGORY_ACCENT[item.category];
                const locked = isLocked(item);
                return (
                  <AnimatedPressable
                    key={item.id}
                    onPress={() => setSelectedItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    style={{ width: featuredWidth }}
                  >
                    <LinearGradient
                      colors={['rgba(255,159,10,0.16)', 'rgba(255,159,10,0.04)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.featuredCard}
                    >
                      <View style={styles.featuredRibbon}>
                        <Ionicons name="star" size={10} color={colors.accent} />
                        <AppText variant="small" style={styles.featuredRibbonText}>
                          {t('store.featuredSection')}
                        </AppText>
                      </View>
                      <View style={styles.featuredTopRow}>
                        <View style={[styles.iconTile, styles.iconTileLg, { backgroundColor: `${accent}1F` }]}>
                          <Ionicons name={item.icon} size={26} color={accent} />
                        </View>
                        <View style={styles.flex}>
                          <AppText variant="h2" numberOfLines={1}>{item.title}</AppText>
                          <View style={styles.badgeRow}>
                            {item.isPremium ? (
                              <View style={styles.proBadge}>
                                <Ionicons name="diamond" size={9} color={colors.accent} />
                                <AppText variant="small" style={styles.proBadgeText}>PRO</AppText>
                              </View>
                            ) : (
                              <View style={styles.freeBadge}>
                                <AppText variant="small" style={styles.freeBadgeText}>{t('store.free')}</AppText>
                              </View>
                            )}
                            {locked && (
                              <View style={styles.lockBadge}>
                                <Ionicons name="lock-closed" size={9} color={colors.textFaint} />
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <AppText variant="small" style={styles.cardDesc} numberOfLines={2}>
                        {item.description}
                      </AppText>
                      <View style={styles.cardFooter}>
                        <View style={styles.metaRow}>
                          <Ionicons name="star" size={11} color={colors.accent} />
                          <AppText variant="small" style={styles.ratingText}>{item.rating ?? 0}</AppText>
                          <AppText variant="small" style={styles.usersText}>({item.users ?? 0})</AppText>
                        </View>
                        {renderPrice(item, locked)}
                      </View>
                    </LinearGradient>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const count =
                cat.key === 'all'
                  ? products.length
                  : products.filter((i) => i.category === cat.key).length;
              return (
                <AnimatedPressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  scaleTo={0.94}
                >
                  <View
                    style={[
                      styles.chip,
                      isActive ? styles.chipActive : styles.chipInactive,
                    ]}
                  >
                    <Ionicons
                      name={cat.key === 'all' ? 'grid-outline' : CATEGORY_ICON[cat.key]}
                      size={13}
                      color={isActive ? '#1A1A2E' : colors.textMuted}
                    />
                    <AppText
                      variant="small"
                      style={isActive ? styles.chipLabelActive : styles.chipLabel}
                    >
                      {t(cat.labelKey)}
                    </AppText>
                    <View style={[styles.chipCount, isActive && styles.chipCountActive]}>
                      <AppText variant="small" style={isActive ? styles.chipCountLabelActive : styles.chipCountLabel}>
                        {count}
                      </AppText>
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="label" style={styles.sectionTitle}>
              {selectedCategory === 'all'
                ? t('store.allProducts')
                : t(CATEGORIES.find((c) => c.key === selectedCategory)!.labelKey)}
            </AppText>
            <AppText variant="small" style={styles.itemsCount}>
              {t('store.items', { count: filteredItems.length })}
            </AppText>
          </View>

          {filteredItems.length === 0 ? (
            <EmptyState title={t('store.empty')} />
          ) : (
            <View style={styles.grid}>
              {filteredItems.map((item, idx) => {
                const accent = item.color ?? CATEGORY_ACCENT[item.category];
                const locked = isLocked(item);
                return (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(idx * 40).springify()}
                    style={{ width: cardWidth }}
                  >
                    <AnimatedPressable
                      onPress={() => setSelectedItem(item)}
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                      style={styles.gridCell}
                    >
                      <View style={[styles.card, styles.cardFill]}>
                        <View style={styles.cardTopRow}>
                          <View style={[styles.iconTile, { backgroundColor: `${accent}1F` }]}>
                            <Ionicons name={item.icon} size={20} color={accent} />
                          </View>
                          {item.isPremium ? (
                            <View style={styles.proBadge}>
                              <Ionicons name="diamond" size={8} color={colors.accent} />
                              <AppText variant="small" style={styles.proBadgeText}>PRO</AppText>
                            </View>
                          ) : (
                            <View style={styles.freeBadge}>
                              <AppText variant="small" style={styles.freeBadgeText}>{t('store.free')}</AppText>
                            </View>
                          )}
                        </View>
                        <AppText variant="label" numberOfLines={1} style={styles.cardTitle}>
                          {item.title}
                        </AppText>
                        <AppText variant="small" numberOfLines={2} style={styles.cardDesc}>
                          {item.description}
                        </AppText>
                        <View style={styles.cardFooter}>
                          <View style={styles.metaRow}>
                            <Ionicons name="star" size={11} color={colors.accent} />
                            <AppText variant="small" style={styles.ratingText}>{item.rating ?? 0}</AppText>
                          </View>
                          {renderPrice(item, locked)}
                        </View>
                      </View>
                    </AnimatedPressable>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={selectedItem !== null} transparent animationType="slide" onRequestClose={closeItem}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeItem} accessibilityLabel={t('common.close')} />
          {selectedItem && (
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <View
                    style={[
                      styles.iconTile,
                      styles.iconTileXl,
                      { backgroundColor: `${selectedItem.color ?? CATEGORY_ACCENT[selectedItem.category]}1F` },
                    ]}
                  >
                    <Ionicons
                      name={selectedItem.icon}
                      size={32}
                      color={selectedItem.color ?? CATEGORY_ACCENT[selectedItem.category]}
                    />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="h1" numberOfLines={2}>{selectedItem.title}</AppText>
                    <View style={styles.badgeRow}>
                      <View style={styles.categoryChip}>
                        <Ionicons
                          name={CATEGORY_ICON[selectedItem.category]}
                          size={10}
                          color={selectedItem.color ?? CATEGORY_ACCENT[selectedItem.category]}
                        />
                        <AppText
                          variant="small"
                          style={{ color: selectedItem.color ?? CATEGORY_ACCENT[selectedItem.category], fontWeight: '700' }}
                        >
                          {t(CATEGORIES.find((c) => c.key === selectedItem.category)!.labelKey)}
                        </AppText>
                      </View>
                      {selectedItem.isPremium ? (
                        <View style={styles.proBadge}>
                          <Ionicons name="diamond" size={9} color={colors.accent} />
                          <AppText variant="small" style={styles.proBadgeText}>PRO</AppText>
                        </View>
                      ) : (
                        <View style={styles.freeBadge}>
                          <AppText variant="small" style={styles.freeBadgeText}>{t('store.free')}</AppText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.sheetMeta}>
                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={13} color={colors.accent} />
                    <AppText variant="small" style={styles.ratingText}>{selectedItem.rating ?? 0}</AppText>
                  </View>
                  <View style={styles.metaDot} />
                  <View style={styles.metaRow}>
                    <Ionicons name="people" size={13} color={colors.textMuted} />
                    <AppText variant="small" style={styles.usersText}>{selectedItem.users ?? 0}</AppText>
                  </View>
                  <View style={styles.flex} />
                  {renderPrice(selectedItem, isLocked(selectedItem))}
                </View>

                <AppText variant="body" style={styles.sheetDesc}>
                  {selectedItem.description}
                </AppText>

                <AppText variant="label" style={styles.includedTitle}>{t('store.included')}</AppText>
                {INCLUDED_KEYS[selectedItem.category].map((key) => (
                  <View key={key} style={styles.includedRow}>
                    <View style={styles.includedCheck}>
                      <Ionicons name="checkmark" size={11} color={colors.primary} />
                    </View>
                    <AppText variant="small" style={styles.includedText}>{t(key)}</AppText>
                  </View>
                ))}
              </ScrollView>

              <AppButton
                title={isLocked(selectedItem) ? t('store.upgradeCta') : t('store.requestCta')}
                onPress={handleCta}
                variant={isLocked(selectedItem) ? 'gold' : 'primary'}
                style={styles.cta}
              />
            </View>
          )}
        </View>
      </Modal>
    </Screen>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: c.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSubtitle: {
    color: c.textMuted,
    marginTop: 2,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: Spacing.sm,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatValue: {
    color: c.text,
  },
  heroRatingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroStatLabel: {
    color: c.textMuted,
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: c.border,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: c.text,
    flex: 1,
  },
  itemsCount: {
    color: c.textFaint,
  },
  featuredCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.35)',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  featuredRibbon: {
    position: 'absolute',
    top: 0,
    right: Spacing.md,
    backgroundColor: c.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
  },
  featuredRibbonText: {
    color: '#1A1A2E',
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.accentDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  proBadgeText: {
    color: c.accent,
    fontWeight: '800',
    fontSize: 10,
  },
  freeBadge: {
    backgroundColor: c.primaryDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  freeBadgeText: {
    color: c.primary,
    fontWeight: '800',
    fontSize: 10,
  },
  lockBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  chipInactive: {
    backgroundColor: c.surface,
    borderColor: c.border,
  },
  chipLabel: {
    color: c.textMuted,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: '#1A1A2E',
    fontWeight: '700',
  },
  chipCount: {
    backgroundColor: c.surfaceElevated,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
  },
  chipCountActive: {
    backgroundColor: 'rgba(26,26,46,0.25)',
  },
  chipCountLabel: {
    color: c.textFaint,
    fontSize: 10,
  },
  chipCountLabelActive: {
    color: '#1A1A2E',
    fontSize: 10,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gridCell: { flex: 1 },
  cardFill: { flex: 1 },
  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileLg: {
    width: 52,
    height: 52,
  },
  iconTileXl: {
    width: 64,
    height: 64,
  },
  cardTitle: {
    color: c.text,
    marginTop: 2,
  },
  cardDesc: {
    color: c.textMuted,
    lineHeight: 17,
    minHeight: 34,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.textFaint,
  },
  ratingText: {
    color: c.accent,
    fontWeight: '700',
    fontSize: 11,
  },
  usersText: {
    color: c.textFaint,
    fontSize: 11,
  },
  pricePaid: {
    color: c.text,
    fontWeight: '800',
  },
  priceFree: {
    color: c.primary,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: c.border,
    maxHeight: '85%',
    paddingBottom: Spacing.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.surfaceElevated,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sheetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: c.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  sheetDesc: {
    color: c.textBody,
    lineHeight: 21,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  includedTitle: {
    color: c.text,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  includedCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  includedText: {
    color: c.textBody,
    flex: 1,
  },
  cta: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
});
