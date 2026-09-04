import { useTranslation } from 'react-i18next';
import { LegalDoc } from '@/components/LegalDoc';

export default function TermosScreen() {
  const { t } = useTranslation();
  return (
    <LegalDoc
      title={t('legal.termos')}
      icon="document-text-outline"
      sections={[
        {
          title: t('legal.termosDoc.s1Title'),
          body: t('legal.termosDoc.s1Body'),
        },
        {
          title: t('legal.termosDoc.s2Title'),
          body: t('legal.termosDoc.s2Body'),
        },
        {
          title: t('legal.termosDoc.s3Title'),
          body: t('legal.termosDoc.s3Body'),
        },
        {
          title: t('legal.termosDoc.s4Title'),
          body: t('legal.termosDoc.s4Body'),
        },
        {
          title: t('legal.termosDoc.s5Title'),
          body: t('legal.termosDoc.s5Body'),
        },
        {
          title: t('legal.termosDoc.s6Title'),
          body: t('legal.termosDoc.s6Body'),
        },
        {
          title: t('legal.termosDoc.s7Title'),
          body: t('legal.termosDoc.s7Body'),
        },
      ]}
    />
  );
}
