import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { DmRow } from '@/components/community/DmRow';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { findOrCreateConversation } from '@/lib/community';
import { Spacing } from '@/core/theme';

export default function NewDmScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profiles, loading } = useProfiles();

  const candidates = Object.values(profiles).filter(
    (p) => p.user_id !== user?.id && p.role !== 'admin',
  );

  const startDm = async (memberId: string) => {
    if (!user) return;
    try {
      const conversationId = await findOrCreateConversation(user.id, memberId);
      router.replace({
        pathname: '/comunidade/dm/[conversationId]',
        params: { conversationId },
      });
    } catch {
      Alert.alert(t('comunidade.errorTitle'), t('workspace.failed'));
    }
  };

  return (
    <Screen>
      <SectionTitle>{t('workspace.selectUser')}</SectionTitle>
      {loading ? (
        <Spinner label={t('workspace.loading')} />
      ) : candidates.length === 0 ? (
        <EmptyState title={t('workspace.noProfiles')} />
      ) : (
        <View style={styles.list}>
          {candidates.map((p) => (
            <DmRow
              key={p.user_id}
              dm={{ conversationId: p.user_id, memberId: p.user_id, createdAt: '' }}
              profiles={profiles}
              onPress={() => startDm(p.user_id)}
              onOpenProfile={(id) =>
                router.push({ pathname: '/comunidade/user/[userId]', params: { userId: id } })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
});
