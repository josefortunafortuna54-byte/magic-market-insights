import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChannels } from "@/hooks/useChannels";
import { useSubscription } from "@/hooks/useSubscription";

export interface PendingQuickShare {
  file: File;
  url: string;
}

let pendingQuickShare: PendingQuickShare | null = null;

export function consumePendingQuickShare(): PendingQuickShare | null {
  const p = pendingQuickShare;
  pendingQuickShare = null;
  return p;
}

export function useQuickCamera() {
  const navigate = useNavigate();
  const channels = useChannels();
  const { isPremium } = useSubscription();
  const [pickChannel, setPickChannel] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingQuickShare | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openCamera = () => fileRef.current?.click();

  const onFilePicked = (file: File) => {
    setPendingImage({ file, url: URL.createObjectURL(file) });
    setPickChannel(true);
  };

  const sendToChannel = (channelId: string) => {
    if (!pendingImage) return;
    setPickChannel(false);
    pendingQuickShare = pendingImage;
    navigate(`/comunidade/canais/${channelId}`);
    setPendingImage(null);
  };

  const cancel = () => {
    setPickChannel(false);
    setPendingImage(null);
  };

  const availableChannels = channels.regular.filter((c) => !c.is_premium || isPremium);

  return {
    openCamera,
    pickChannel,
    pendingImage,
    sendToChannel,
    cancel,
    onFilePicked,
    fileRef,
    availableChannels,
  };
}