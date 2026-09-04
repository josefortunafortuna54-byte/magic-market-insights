import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import {
  formatClosesIn,
  pairRoomClosesInMs,
  pairRoomState,
} from '@/core/community';
import { Spacing } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Channel } from '@/core/types';

export function PairRoomRow({ channel, onPress }: { channel: Channel; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const active = pairRoomState(channel) === 'active';
  const closesIn = formatClosesIn(pairRoomClosesInMs(channel));

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <AppText style={styles.bot}>🤖</AppText>
      <View style={styles.info}>
        <AppText style={styles.pair}>{channel.pair || channel.display_name}</AppText>
        <AppText variant="small" style={{ color: colors.textMuted }}>
          {active ? `#${channel.name}` : t('workspace.closed')}
        </AppText>
      </View>
      <AppText
        variant="small"
        style={{ color: active ? colors.primary : colors.textFaint, fontWeight: '700' }}
      >
        {active ? t('workspace.closesIn', { time: closesIn }) : '🔒'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
  },
  bot: { fontSize: 16 },
  info: { flex: 1, gap: 2 },
  pair: { fontWeight: '700' },
});
