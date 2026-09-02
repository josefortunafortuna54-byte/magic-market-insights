import { useTranslation } from 'react-i18next';
import { LegalDoc } from '@/components/LegalDoc';

export default function AvisoRiscoScreen() {
  const { t } = useTranslation();
  return (
    <LegalDoc
      title={t('legal.aviso')}
      icon="warning-outline"
      intro={t('legal.avisoRiscoDoc.intro')}
      sections={[
        {
          title: t('legal.avisoRiscoDoc.s1Title'),
          body: t('legal.avisoRiscoDoc.s1Body'),
        },
        {
          title: t('legal.avisoRiscoDoc.s2Title'),
          body: t('legal.avisoRiscoDoc.s2Body'),
        },
        {
          title: t('legal.avisoRiscoDoc.s3Title'),
          body: t('legal.avisoRiscoDoc.s3Body'),
        },
        {
          title: t('legal.avisoRiscoDoc.s4Title'),
          body: t('legal.avisoRiscoDoc.s4Body'),
        },
        {
          title: t('legal.avisoRiscoDoc.s5Title'),
          body: t('legal.avisoRiscoDoc.s5Body'),
        },
        {
          title: t('legal.avisoRiscoDoc.s6Title'),
          body: t('legal.avisoRiscoDoc.s6Body'),
        },
      ]}
    />
  );
}
