import { AppText } from '@/components/ui';
import { BoomCard } from '@/components/BoomCard';
import { useBoom } from '@/hooks/useBoom';
import { useBoomSocial } from '@/hooks/useBoomSocial';
import { useTranslation } from 'react-i18next';
import type { BoomTime, Message } from '@/core/types';

function BoomCardContainer({ boom }: { boom: BoomTime }) {
  const { comments, votes } = useBoomSocial(boom.id);
  return <BoomCard boom={boom} comments={comments} votes={votes} />;
}

export function BoomMessage({ message }: { message: Message }) {
  const { t } = useTranslation();
  const { boom } = useBoom(message.boom_id || '');
  if (!boom) {
    return <AppText variant="muted">{t('workspace.loading')}</AppText>;
  }
  return <BoomCardContainer boom={boom} />;
}
