import { useTranslation } from 'react-i18next';
import { LegalDoc } from '@/components/LegalDoc';

export default function PrivacidadeScreen() {
  const { t } = useTranslation();
  return (
    <LegalDoc
      title={t('legal.privacidade')}
      icon="shield-checkmark-outline"
      sections={[
        {
          title: t('legal.privacidadeDoc.s1Title'),
          body: t('legal.privacidadeDoc.s1Body'),
        },
        {
          title: t('legal.privacidadeDoc.s2Title'),
          body: t('legal.privacidadeDoc.s2Body'),
        },
        {
          title: t('legal.privacidadeDoc.s3Title'),
          body: t('legal.privacidadeDoc.s3Body'),
        },
        {
          title: t('legal.privacidadeDoc.s4Title'),
          body: t('legal.privacidadeDoc.s4Body'),
        },
        {
          title: t('legal.privacidadeDoc.s5Title'),
          body: t('legal.privacidadeDoc.s5Body'),
        },
        {
          title: t('legal.privacidadeDoc.s6Title'),
          body: t('legal.privacidadeDoc.s6Body'),
        },
        {
          title: t('legal.privacidadeDoc.s7Title'),
          body: t('legal.privacidadeDoc.s7Body'),
        },
      ]}
    />
  );
}
