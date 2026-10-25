import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { authApi, messageFor } from '@/api';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { Button, Screen, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useDismiss } from '@/navigation/useDismiss';

/** Matches the server's floor (app.auth.min-password-length). */
const MIN_LENGTH = 8;

/**
 * The coach sets a temporary password when they open the account and reads it
 * out across the desk. This is where the member makes it their own. Every
 * other device is signed out; this one is handed fresh tokens and carries on.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const dismiss = useDismiss('/account');
  const { t } = useI18n();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const problems: string[] = [];
  if (next && next.length < MIN_LENGTH) problems.push(t.changePassword.tooShort(MIN_LENGTH));
  if (next && current && next === current) problems.push(t.changePassword.same);
  if (confirm && confirm !== next) problems.push(t.changePassword.mismatch);

  const valid = current.length > 0 && next.length >= MIN_LENGTH && confirm === next && next !== current;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await authApi.changePassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Screen scroll>
        <PageHeader title={t.changePassword.doneTitle} onBack={dismiss} />
        <Text variant="body" color="textSecondary" style={styles.doneNote}>
          {t.changePassword.doneNote}
        </Text>
        <Button label={t.changePassword.done} onPress={dismiss} style={styles.save} />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title={t.changePassword.title}
        subtitle={t.changePassword.subtitle}
        onBack={() => router.back()}
      />

      <View style={styles.form}>
        <TextField
          label={t.changePassword.current}
          value={current}
          onChangeText={setCurrent}
          secure
          autoComplete="current-password"
        />
        <TextField
          label={t.changePassword.next}
          value={next}
          onChangeText={setNext}
          secure
          autoComplete="new-password"
        />
        <TextField
          label={t.changePassword.confirm}
          value={confirm}
          onChangeText={setConfirm}
          secure
          autoComplete="new-password"
        />
      </View>

      {problems.length > 0 ? (
        <View style={styles.problems}>
          {problems.map((problem) => (
            <Text key={problem} variant="caption" color="danger">
              {problem}
            </Text>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button label={t.changePassword.submit} disabled={!valid} loading={saving} onPress={() => void save()} style={styles.save} />

      <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
        {t.changePassword.footnote}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 26, gap: 18 },
  problems: { marginTop: 16, gap: 6 },
  error: { marginTop: 16 },
  save: { marginTop: 28 },
  footnote: { marginTop: 16 },
  doneNote: { marginTop: 24, lineHeight: 22 },
});
