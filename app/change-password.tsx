import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { authApi, messageFor } from '@/api';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { Button, Screen, Text } from '@/components/ui';
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

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const problems: string[] = [];
  if (next && next.length < MIN_LENGTH) problems.push(`The new password needs at least ${MIN_LENGTH} characters.`);
  if (next && current && next === current) problems.push('The new password has to be different.');
  if (confirm && confirm !== next) problems.push('The two new passwords do not match.');

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
        <PageHeader title="Password Changed" onBack={dismiss} />
        <Text variant="body" color="textSecondary" style={styles.doneNote}>
          Your new password is set. Any other phone or browser you were signed in on has been signed
          out — use the new password there.
        </Text>
        <Button label="Done" onPress={dismiss} style={styles.save} />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title="Change Password"
        subtitle="Swap the one your coach gave you for one only you know."
        onBack={() => router.back()}
      />

      <View style={styles.form}>
        <TextField
          label="CURRENT PASSWORD"
          value={current}
          onChangeText={setCurrent}
          secure
          autoComplete="current-password"
        />
        <TextField
          label="NEW PASSWORD"
          value={next}
          onChangeText={setNext}
          secure
          autoComplete="new-password"
        />
        <TextField
          label="CONFIRM NEW PASSWORD"
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

      <Button label="Change Password" disabled={!valid} loading={saving} onPress={() => void save()} style={styles.save} />

      <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
        Forgotten your current one? Your coach can set a new one for you.
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
