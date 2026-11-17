import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { Button } from '@/components/ui';
import { LegalPage } from '@/components/legal';
import { supportEmail } from '@/config/brand';
import { useI18n } from '@/i18n';

/**
 * Public: the URL given to the app stores for "how a user asks for their
 * account to be deleted". It has to work for someone who has uninstalled the
 * app and cannot sign in, so it explains both routes and never needs a session.
 * The screen that actually deletes is /delete-account, behind sign-in.
 */
export default function AccountDeletionScreen() {
  const router = useRouter();
  const { t } = useI18n();

  const email = () => {
    Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent('Delete my account')}`).catch(() => {
      // No mail app: the address is written on the page.
    });
  };

  return (
    <LegalPage
      title={t.legal.deletionTitle}
      intro={t.legal.deletionIntro}
      sections={t.legal.deletionSteps(supportEmail)}
    >
      <Button label={t.legal.emailUs} variant="secondary" onPress={email} />
      <Button label={t.legal.readPrivacy} variant="ghost" onPress={() => router.push('/privacy')} />
    </LegalPage>
  );
}
