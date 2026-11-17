import { Card, Text } from '@/components/ui';
import { LegalPage } from '@/components/legal';
import { supportEmail } from '@/config/brand';
import { useI18n } from '@/i18n';

/** Public: the URL given to the app stores as the privacy policy. */
export default function PrivacyScreen() {
  const { t } = useI18n();

  return (
    <LegalPage
      title={t.legal.privacyTitle}
      subtitle={t.legal.effective}
      intro={t.legal.privacyIntro}
      sections={t.legal.privacy(supportEmail)}
    >
      <Card variant="alt" style={{ gap: 6 }}>
        <Text variant="bodyStrong">{t.legal.disclaimerTitle}</Text>
        <Text variant="caption" color="textSecondary" style={{ lineHeight: 20 }}>
          {t.legal.disclaimer}
        </Text>
      </Card>
    </LegalPage>
  );
}
