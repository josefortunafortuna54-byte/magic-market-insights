import { useState } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, EmptyState, Screen } from '@/components/ui';
import { ChannelCard } from '@/components/community/ChannelCard';
import { ChannelPickerModal } from '@/components/community/ChannelPickerModal';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { CommunityHero } from '@/components/community/CommunityHero';
import { DmRow } from '@/components/community/DmRow';
import { PairRoomCard } from '@/components/community/PairRoomCard';
import { WorkspaceSection } from '@/components/community/WorkspaceSection';
import { useChannels } from '@/hooks/useChannels';
import { useConversations } from '@/hooks/useConversations';
import { useProfiles } from '@/hooks/useProfiles';
import { useQuickCamera } from '@/hooks/useQuickCamera';
import { useSubscription } from '@/hooks/useSubscription';
import { isAdminEmail } from '@/lib/supabase';
import { useTourTarget } from '@/components/tour/registry';
import { pairRoomState } from '@/core/community';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Channel } from '@/core/types';

type Tab = 'feed' | 'workspace';

function SkeletonRow({ width }: { width: DimensionValue }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonTile} />
      <View style={styles.skeletonLines}>
        <View style={[styles.skeletonLine, { width: '55%' }]} />
        <View style={[styles.skeletonLine, { width }] } />
      </View>
    </View>
  );
}

function WorkspaceSkeleton() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((i) => (
        <SkeletonRow key={`a${i}`} width="80%" />
      ))}
      <View style={styles.skeletonGap} />
      {[0, 1].map((i) => (
        <SkeletonRow key={`b${i}`} width="70%" />
      ))}
    </View>
  );
}

export default function ComunidadeScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('workspace');

  const channels = useChannels();
  const conversations = useConversations();
  const profiles = useProfiles();
  const { user, isPremium } = useSubscription();
  const camera = useQuickCamera();

  const canCreateChannel = isAdminEmail(user?.email) || isPremium;
  const searchRef = useTourTarget('tour:comunidade-search');

  const liveRooms = channels.pairRooms.filter((c) => pairRoomState(c) === 'active').length;

  const openChannel = (channel: Channel) => {
    if (channel.is_premium && !isPremium) return;
    router.push({
      pathname: '/comunidade/canais/[channelId]',
      params: { channelId: channel.id },
    });
  };

  const openDm = (conversationId: string) => {
    router.push({
      pathname: '/comunidade/dm/[conversationId]',
      params: { conversationId },
    });
  };

  const openProfile = (userId: string) => {
    router.push({ pathname: '/comunidade/user/[userId]', params: { userId } });
  };

  return (
    <Screen safeTop>
      <View ref={searchRef} collapsable={false} style={styles.headerRow}>
        <Pressable onPress={() => router.push('/comunidade/pesquisa')} style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <AppText variant="muted" style={styles.searchText}>{t('workspace.searchPlaceholder')}</AppText>
        </Pressable>
        <Pressable onPress={camera.openCamera} style={styles.iconBtn}>
          <Ionicons name="camera-outline" size={21} color={colors.accent} />
        </Pressable>
        <Pressable onPress={() => router.push('/comunidade/loja')} style={styles.iconBtn}>
          <Ionicons name="storefront-outline" size={21} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.segment}>
        {(
          [
            ['workspace', 'git-network-outline'],
            ['feed', 'newspaper-outline'],
          ] as [Tab, keyof typeof Ionicons.glyphMap][]
        ).map(([key, icon]) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}>
              <Ionicons
                name={icon}
                size={15}
                color={active ? colors.text : colors.textFaint}
              />
              <AppText
                variant="small"
                style={active ? styles.segmentTextActive : styles.segmentText}>
                {key === 'workspace' ? t('workspace.segmented') : t('workspace.feed')}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {tab === 'feed' ? (
        <CommunityFeed />
      ) : (
        <>
          {channels.error ? (
            <View style={styles.banner}>
              <AppText variant="small" style={{ color: colors.destructive, flex: 1 }}>
                {t('comunidade.errorTitle')}
              </AppText>
              <AppButton
                title={t('workspace.retry')}
                onPress={channels.refresh}
                disabled={channels.loading}
              />
            </View>
          ) : null}

          {channels.loading ? (
            <WorkspaceSkeleton />
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(400)}>
                <CommunityHero
                  channelsCount={channels.regular.length + liveRooms}
                  liveRooms={liveRooms}
                />
              </Animated.View>

              <WorkspaceSection
                title={t('workspace.channels')}
                right={
                  canCreateChannel ? (
                    <Ionicons
                      name="add-circle"
                      size={24}
                      color={colors.primary}
                      onPress={() => router.push('/comunidade/novo-canal')}
                    />
                  ) : undefined
                }
              >
                {channels.regular.length === 0 ? (
                  <EmptyState
                    title={t('workspace.emptyChannels')}
                    subtitle={
                      canCreateChannel ? t('workspace.emptyChannelsHintCreator') : t('workspace.emptyChannelsHint')
                    }
                  />
                ) : (
                  channels.regular.map((c, i) => (
                    <ChannelCard key={c.id} channel={c} index={i} onPress={() => openChannel(c)} />
                  ))
                )}
              </WorkspaceSection>

              <WorkspaceSection
                title={t('workspace.pairRooms')}
                right={
                  liveRooms > 0 ? (
                    <View style={styles.liveCountChip}>
                      <View style={styles.liveDot} />
                      <AppText variant="small" style={styles.liveCountText}>
                        {liveRooms}
                      </AppText>
                    </View>
                  ) : undefined
                }
              >
                {channels.pairRooms.length === 0 ? (
                  <EmptyState
                    title={t('workspace.emptyPairRooms')}
                    subtitle={t('workspace.emptyPairRoomsHint')}
                  />
                ) : (
                  channels.pairRooms.map((c, i) => (
                    <PairRoomCard key={c.id} channel={c} index={i} onPress={() => openChannel(c)} />
                  ))
                )}
              </WorkspaceSection>

              <WorkspaceSection
                title={t('workspace.dms')}
                right={
                  isPremium ? (
                    <Ionicons
                      name="add-circle"
                      size={24}
                      color={colors.primary}
                      onPress={() => router.push('/comunidade/novo-dm')}
                    />
                  ) : undefined
                }
              >
                {conversations.loading ? (
                  <View style={styles.skeletonWrap}>
                    {[0, 1].map((i) => (
                      <SkeletonRow key={i} width="75%" />
                    ))}
                  </View>
                ) : conversations.dms.length === 0 ? (
                  <EmptyState
                    title={t('workspace.emptyDms')}
                    subtitle={isPremium ? t('workspace.emptyDmsHintPremium') : t('workspace.emptyDmsHint')}
                  />
                ) : (
                  conversations.dms.map((dm, i) => (
                    <DmRow
                      key={dm.conversationId}
                      dm={dm}
                      profiles={profiles.profiles}
                      index={i}
                      onPress={() => openDm(dm.conversationId)}
                      onOpenProfile={openProfile}
                    />
                  ))
                )}
              </WorkspaceSection>
            </>
          )}
        </>
      )}

      <ChannelPickerModal
        visible={camera.pickChannel}
        channels={camera.availableChannels}
        onSelect={camera.sendToChannel}
        onCancel={camera.cancel}
      />
    </Screen>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderColor: `${colors.accent}44`,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: { color: colors.textMuted },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
    marginBottom: Spacing.md,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 999,
  },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textFaint, fontWeight: '600' },
  segmentTextActive: { color: colors.text, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${colors.destructive}1F`,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  liveCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.liveDim,
    borderColor: `${colors.live}55`,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  liveCountText: { color: colors.live, fontWeight: '800' },
  skeletonWrap: { gap: Spacing.sm },
  skeletonGap: { height: Spacing.lg },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm + 2,
  },
  skeletonTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceElevated,
  },
});
