import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppInput, AppText, Screen, Spinner } from '@/components/ui';
import { PremiumLock } from '@/components/PremiumLock';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/hooks/useSubscription';
import { isAdminEmail } from '@/lib/supabase';
import { Spacing } from '@/core/theme';

export default function NovoCanalScreen() {
  const { t } = useTranslation();
  const { user, isPremium, loading: subLoading } = useSubscription();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!subLoading && !isPremium && !isAdminEmail(user?.email)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('workspace.newChannel') }} />
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <PremiumLock
            label={t('workspace.newChannel')}
            description={t('analises.premiumDesc')}
          />
        </View>
      </Screen>
    );
  }

  if (subLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('workspace.newChannel') }} />
        <Spinner label={t('common.loading')} />
      </Screen>
    );
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .trim();

  const canSave = slug.length >= 2 && displayName.trim().length >= 1 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase.from('channels').insert({
      name: slug,
      display_name: displayName.trim(),
      type: 'regular',
    });
    setSaving(false);
    if (error) {
      if (error.code === '23505') {
        Alert.alert(t('workspace.channelNameExists'));
      } else {
        Alert.alert(t('workspace.channelCreateFailed'), error.message);
      }
      return;
    }
    const { data: ch } = await supabase
      .from('channels')
      .select('id')
      .eq('name', slug)
      .maybeSingle();
    Alert.alert(t('workspace.channelCreated'), undefined, [
      {
        text: t('common.ok'),
        onPress: () => {
          if (ch?.id) {
            router.replace({
              pathname: '/comunidade/canais/[channelId]',
              params: { channelId: ch.id },
            });
          } else {
            router.back();
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('workspace.newChannel') }} />
      <AppText variant="muted" style={styles.hint}>
        {t('workspace.newChannelHint')}
      </AppText>

      <AppInput
        label={t('workspace.channelName')}
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="analises"
      />
      {slug.length > 0 && slug.length < 2 ? (
        <AppText variant="small" style={styles.error}>{t('workspace.channelNameMin')}</AppText>
      ) : null}

      <AppInput
        label={t('workspace.channelName')}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={t('workspace.channelDisplayNamePlaceholder')}
      />

      {saving ? (
        <Spinner label={t('workspace.channelCreating')} />
      ) : (
        <AppButton
          title={t('workspace.channelCreate')}
          onPress={save}
          disabled={!canSave}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: Spacing.md },
  error: { color: '#ef4444', marginBottom: Spacing.xs },
});
