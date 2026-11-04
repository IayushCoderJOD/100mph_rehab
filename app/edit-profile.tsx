import { useRouter } from 'expo-router';
import { ProfilePayload, authApi, messageFor } from '@/api';
import { useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/common';
import { ProfileForm } from '@/components/settings';
import { Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useDismiss } from '@/navigation/useDismiss';

/**
 * Your own details. A member keeps their name, number and the three figures a
 * physio wants before writing a week; staff keep their name and number, since
 * they do not train here. The coach's side of this is app/admin/edit/[id].tsx.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const dismiss = useDismiss('/(tabs)/settings');
  const { user, refresh } = useAuth();
  const { isAdmin } = useAccess();
  const { t } = useI18n();

  const save = async (profile: ProfilePayload) => {
    try {
      await authApi.saveProfile(profile);
    } catch (err) {
      return messageFor(err);
    }
    await refresh();
    dismiss();
    return null;
  };

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title={t.editProfile.title}
        subtitle={isAdmin ? t.editProfile.adminSubtitle : t.editProfile.subtitle}
        onBack={() => router.back()}
      />

      {user ? (
        <ProfileForm
          user={user}
          subject="self"
          showBody={!isAdmin}
          footnote={isAdmin ? undefined : t.editProfile.footnote}
          onSave={save}
        />
      ) : null}
    </Screen>
  );
}
