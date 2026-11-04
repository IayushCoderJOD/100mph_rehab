import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { RequirePermission } from '@/access';
import { useClientDetail } from '@/admin';
import { ProfilePayload } from '@/api';
import { PageHeader } from '@/components/common';
import { ProfileForm } from '@/components/settings';
import { Button, Card, Loader, Screen, Text } from '@/components/ui';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useI18n } from '@/i18n';
import { useDismiss } from '@/navigation/useDismiss';

function EditClientForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateUser } = useDirectory();
  const { t } = useI18n();
  const dismiss = useDismiss(`/admin/client/${id}`);
  // Read fresh, not from the roster: this saves the whole record, so a stale
  // row would undo whatever the client changed since the list loaded.
  const { data: detail, loading, error, reload } = useClientDetail(id ?? null);
  const client = detail?.user ?? null;

  const save = async (profile: ProfilePayload, email: string) => {
    const result = await updateUser(id as string, { ...profile, email });
    if (!result.ok) return result.error;
    dismiss();
    return null;
  };

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title={client ? t.adminEdit.title(client.full_name.split(' ')[0]) : t.adminEdit.fallbackTitle}
        subtitle={t.adminEdit.subtitle}
        onBack={() => router.back()}
      />

      {client ? (
        <ProfileForm user={client} subject="client" editEmail footnote={t.adminEdit.footnote} onSave={save} />
      ) : loading ? (
        <Loader />
      ) : (
        <Card style={styles.notice}>
          <Text variant="caption" color="textSecondary" align="center">
            {error ?? t.adminClient.notFound}
          </Text>
          <Button label={t.common.tryAgain} variant="secondary" onPress={() => void reload()} style={styles.retry} />
        </Card>
      )}
    </Screen>
  );
}

export default function EditClientScreen() {
  return (
    <RequirePermission permission="clients.edit" fallback="/(tabs)/clients">
      <EditClientForm />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', paddingVertical: 28, marginTop: 24 },
  retry: { marginTop: 14 },
});
