import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RequirePermission } from '@/access';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { Button, Card, Screen, Text } from '@/components/ui';
import { UserRole, mock } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useTheme } from '@/theme';

const MIN_PASSWORD = 8;

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: 'member', label: 'Member', hint: 'Trains on a program. No access to client data.' },
  { value: 'admin', label: 'Admin', hint: 'Manages clients, prescriptions and accounts.' },
];

function CreateUserForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const { createUser } = useDirectory();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [programId, setProgramId] = useState(mock.programs[0].id);
  const [role, setRole] = useState<UserRole>('member');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const valid =
    fullName.trim().length > 1 && emailValid && password.length >= MIN_PASSWORD && !!programId;

  const submit = async () => {
    setError(null);
    if (!valid || submitting) return;

    setSubmitting(true);
    const result = await createUser({
      full_name: fullName,
      email,
      phone: phone.trim(),
      password,
      program_id: programId,
      role,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Confirm rather than navigate away: the coach usually has to read the
    // credentials back to the client before leaving this screen.
    setDone(email.trim().toLowerCase());
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('member');
  };

  if (done) {
    return (
      <Screen scroll>
        <PageHeader title="Account created" onBack={() => router.back()} />

        <Card variant="alt" style={styles.doneCard}>
          <Ionicons name="checkmark-circle" size={44} color={theme.colors.accent} />
          <Text variant="heading" align="center" style={styles.doneTitle}>
            {done}
          </Text>
          <Text variant="caption" color="textSecondary" align="center" style={styles.doneNote}>
            They can sign in with the email and password you set. The account is marked Invited
            until they log in for the first time.
          </Text>
        </Card>

        <Button label="Create Another" onPress={() => setDone(null)} style={styles.submit} />
        <Button
          label="Back to Clients"
          variant="ghost"
          onPress={() => router.back()}
          style={styles.secondaryAction}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title="Create Client Account"
        subtitle="Access is provisioned here — there is no public sign-up."
        onBack={() => router.back()}
      />

      <View style={styles.form}>
        <TextField
          label="FULL NAME"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Rhea Menon"
          autoCapitalize="words"
        />
        <TextField
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="rhea@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="PHONE (OPTIONAL)"
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 90000 00000"
          keyboardType="phone-pad"
        />
        <TextField
          label="TEMPORARY PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          secure
          autoCapitalize="none"
        />
      </View>

      <Text variant="heading" style={styles.sectionTitle}>
        Program
      </Text>
      <View style={styles.options}>
        {mock.programs.map((program) => {
          const active = program.id === programId;

          return (
            <Pressable
              key={program.id}
              onPress={() => setProgramId(program.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: active ? theme.colors.accentSoft : theme.colors.surface,
                  borderColor: active ? theme.colors.accentBorder : theme.colors.border,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name={program.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={active ? theme.colors.accent : theme.colors.textSecondary}
              />
              <View style={styles.optionBody}>
                <Text variant="bodyStrong">{program.name}</Text>
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {program.tagline}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text variant="heading" style={styles.sectionTitle}>
        Role
      </Text>
      <View style={styles.options}>
        {ROLE_OPTIONS.map((option) => {
          const active = option.value === role;

          return (
            <Pressable
              key={option.value}
              onPress={() => setRole(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: active ? theme.colors.accentSoft : theme.colors.surface,
                  borderColor: active ? theme.colors.accentBorder : theme.colors.border,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
                    backgroundColor: active ? theme.colors.accent : 'transparent',
                  },
                ]}
              >
                {active ? (
                  <Ionicons name="checkmark-sharp" size={13} color={theme.colors.onAccent} />
                ) : null}
              </View>
              <View style={styles.optionBody}>
                <Text variant="bodyStrong">{option.label}</Text>
                <Text variant="caption" color="textSecondary">
                  {option.hint}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        label="Create Account"
        disabled={!valid}
        loading={submitting}
        onPress={submit}
        style={styles.submit}
      />

      <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
        The client should change this password after their first sign-in.
      </Text>
    </Screen>
  );
}

/** Creating accounts is admin-only, a step above the rest of the back office. */
export default function CreateUserScreen() {
  return (
    <RequirePermission permission="clients.create" fallback="/(tabs)/clients">
      <CreateUserForm />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 26, gap: 18 },
  sectionTitle: { marginTop: 32, marginBottom: 14 },
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, padding: 14 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: { flex: 1, gap: 2 },
  error: { marginTop: 16 },
  submit: { marginTop: 28 },
  secondaryAction: { marginTop: 10 },
  footnote: { marginTop: 18, paddingHorizontal: 16 },
  doneCard: { alignItems: 'center', paddingVertical: 36, marginTop: 24 },
  doneTitle: { marginTop: 16 },
  doneNote: { marginTop: 8, paddingHorizontal: 8 },
});
