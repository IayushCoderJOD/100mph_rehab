import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, messageFor } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useI18n } from '@/i18n';

/**
 * Deleting your own account, for members and staff alike. The app stores
 * require it to be possible inside the app, and it is a real delete: the
 * account and everything recorded about it are removed from the database.
 *
 * The password is asked again so a phone left unlocked cannot do it. On
 * success the session ends and the sign-in screen says what happened.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, deleteAccount } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';

  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!password || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(password);
      // Signed out: the sign-in screen takes over from here.
    } catch (err) {
      // The shared copy for this code talks about a "current" password, from the change-password form.
      setError(
        err instanceof ApiError && err.code === 'current_password_incorrect'
          ? t.deleteAccount.wrongPassword
          : messageFor(err)
      );
      setDeleting(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader title={t.deleteAccount.title} subtitle={t.deleteAccount.subtitle} onBack={() => router.back()} />

      <Card style={styles.card}>
        <Text variant="bodyStrong">{t.deleteAccount.whatIsDeleted}</Text>
        <View style={styles.list}>
          {(isAdmin ? t.deleteAccount.adminLoses : t.deleteAccount.memberLoses).map((line) => (
            <Text key={line} variant="caption" color="textSecondary">
              •  {line}
            </Text>
          ))}
        </View>
        {isAdmin ? (
          <Text variant="caption" color="textSecondary" style={styles.note}>
            {t.deleteAccount.adminNote}
          </Text>
        ) : (
          <Text variant="caption" color="textSecondary" style={styles.note}>
            {t.deleteAccount.memberNote}
          </Text>
        )}
      </Card>

      <View style={styles.form}>
        <TextField
          label={t.deleteAccount.password}
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="current-password"
        />
      </View>

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        label={t.deleteAccount.confirm}
        variant="danger"
        disabled={!password}
        loading={deleting}
        onPress={() => void remove()}
        style={styles.delete}
      />
      <Button label={t.deleteAccount.keep} variant="ghost" disabled={deleting} onPress={() => router.back()} style={styles.keep} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 24, gap: 8 },
  list: { gap: 6, marginTop: 4 },
  note: { marginTop: 6, lineHeight: 19 },
  form: { marginTop: 24 },
  error: { marginTop: 16 },
  delete: { marginTop: 28 },
  keep: { marginTop: 12 },
});
