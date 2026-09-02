import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useChannels } from '@/hooks/useChannels';
import { useSubscription } from '@/hooks/useSubscription';

export function useQuickCamera() {
  const router = useRouter();
  const channels = useChannels();
  const { isPremium } = useSubscription();
  const { t } = useTranslation();
  const [pickChannel, setPickChannel] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; name: string; type: string } | null>(null);

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('workspace.permission'), t('workspace.cameraPermission'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    setPendingImage({
      uri: asset.uri,
      name: `img-${Date.now()}.${ext}`,
      type: asset.mimeType || `image/${ext}`,
    });
    setPickChannel(true);
  };

  const sendToChannel = (channelId: string) => {
    if (!pendingImage) return;
    setPickChannel(false);
    router.push({
      pathname: '/comunidade/canais/[channelId]',
      params: { channelId, pendingImageUri: pendingImage.uri },
    });
    setPendingImage(null);
  };

  const cancel = () => {
    setPickChannel(false);
    setPendingImage(null);
  };

  const availableChannels = channels.regular.filter((c) => !c.is_premium || isPremium);

  return { openCamera, pickChannel, pendingImage, sendToChannel, cancel, availableChannels };
}
