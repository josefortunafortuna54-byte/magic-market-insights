import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Chip, EmptyState, SectionTitle, Spinner } from '@/components/ui';
import { BoomCard } from '@/components/BoomCard';
import { useBooms } from '@/hooks/useBooms';
import { useBoomSocial } from '@/hooks/useBoomSocial';
import { getBoomStatus } from '@/core/booms';
import { useTheme } from '@/hooks/useTheme';
import type { BoomTime } from '@/core/types';

type Filter = 'todos' | 'live' | 'upcoming' | 'expired';
type FilterLabel = 'comunidade.all' | 'comunidade.live' | 'comunidade.upcoming' | 'comunidade.closed';

const FILTERS: { key: Filter; label: FilterLabel }[] = [
  { key: 'todos', label: 'comunidade.all' },
  { key: 'live', label: 'comunidade.live' },
  { key: 'upcoming', label: 'comunidade.upcoming' },
  { key: 'expired', label: 'comunidade.closed' },
];

function LiveBadge() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Badge color={colors.live} bg={`${colors.live}1F`}>{t('comunidade.liveBadge')}</Badge>
    </Animated.View>
  );
}

function BoomCardContainer({ boom }: { boom: BoomTime }) {
  const { comments, votes } = useBoomSocial(boom.id);
  return <BoomCard boom={boom} comments={comments} votes={votes} />;
}

export function CommunityFeed() {
  const { t } = useTranslation();
  const { booms, loading, error } = useBooms();
  const [filter, setFilter] = useState<Filter>('todos');

  const liveCount = booms.filter((b) => getBoomStatus(b.boom_time) === 'live').length;

  const sorted = [...booms].sort(
    (a, b) => new Date(b.boom_time).getTime() - new Date(a.boom_time).getTime(),
  );

  const filtered = sorted.filter((b) => {
    const status = getBoomStatus(b.boom_time);
    if (filter === 'live') return status === 'live';
    if (filter === 'upcoming') return status === 'upcoming';
    if (filter === 'expired') return status === 'expired';
    return true;
  });

  return (
    <View style={styles.container}>
      <SectionTitle right={liveCount > 0 ? <LiveBadge /> : null}>{t('comunidade.title')}</SectionTitle>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={t(f.label)}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {loading ? (
        <Spinner label={t('comunidade.loading')} />
      ) : error ? (
        <EmptyState title={t('comunidade.errorTitle')} subtitle={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('comunidade.emptyTitle')} subtitle={t('comunidade.emptyBody')} />
      ) : (
        filtered.map((boom) => <BoomCardContainer key={boom.id} boom={boom} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
});
