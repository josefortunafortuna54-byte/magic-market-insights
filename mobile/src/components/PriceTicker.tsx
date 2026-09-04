import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PriceData } from '@/core/types';

function PriceChip({
  pair,
  data,
  loading,
  selected,
  onPressPair,
}: {
  pair: string;
  data: PriceData;
  loading?: boolean;
  selected?: string;
  onPressPair?: (pair: string) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [flashAnim] = useState(() => new Animated.Value(0));
  const prevPrice = useRef(data.price);

  useEffect(() => {
    if (prevPrice.current !== data.price && data.price !== '—') {
      flashAnim.setValue(1);
      Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start();
      prevPrice.current = data.price;
    }
  }, [data.price, flashAnim]);

  const up = data.change > 0;
  const down = data.change < 0;
  const changeColor = data.change === 0 ? colors.textMuted : up ? colors.success : colors.destructive;
  const changeText = data.change === 0 ? '0.00%' : `${up ? '+' : ''}${data.change.toFixed(2)}%`;

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, down ? 'rgba(255,69,58,0.15)' : 'rgba(52,199,89,0.15)'],
  });

  const borderColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, changeColor],
  });

  return (
    <Animated.View style={[{ backgroundColor: bgColor, borderColor, borderWidth: 1, borderRadius: Radius.md }, selected === pair && styles.chipSelected]}>
      <Pressable
        disabled={!onPressPair}
        onPress={onPressPair ? () => onPressPair(pair) : undefined}
        style={styles.chipInner}>
        <AppText variant="small" style={styles.pair}>{pair}</AppText>
        <AppText variant="mono" style={[styles.price, { color: changeColor }]} numberOfLines={1}>
          {loading ? '—' : data.price}
        </AppText>
        <AppText variant="small" style={[styles.change, { color: changeColor }]}>
          {loading ? '—' : changeText}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

export function PriceTicker({
  pairs,
  prices,
  onPressPair,
  loading,
  selected,
}: {
  pairs: string[];
  prices: Record<string, PriceData>;
  onPressPair?: (pair: string) => void;
  loading?: boolean;
  selected?: string;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {pairs.map((pair) => (
        <PriceChip
          key={pair}
          pair={pair}
          data={prices[pair] ?? { price: '—', change: 0 }}
          loading={loading}
          selected={selected}
          onPressPair={onPressPair}
        />
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: { gap: Spacing.sm },
    chipInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      gap: Spacing.sm,
    },
    chipSelected: {
      backgroundColor: c.accentDim,
      borderColor: c.accent,
    },
    pair: { color: c.textMuted, fontWeight: '600' },
    price: { fontSize: 14, fontWeight: '700' },
    change: { fontWeight: '700', minWidth: 48, textAlign: 'right' },
  });
