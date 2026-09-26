import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RequirePermission } from '@/access';
import { PlanDraft, daysMissingPrescriptions, draftToPayload, emptyDraft, trainingDayCount } from '@/admin/planDraft';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { WeeklyPlanEditor } from '@/components/plan';
import { Button, Card, Screen, Text } from '@/components/ui';
import { DAY_LABEL, User, UserRole, mock } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useTheme } from '@/theme';

const MIN_PASSWORD = 8;

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: 'member', label: 'Member', hint: 'A patient. Trains on the week you write for them.' },
  { value: 'admin', label: 'Admin', hint: 'Staff. Manages clients, weeks and accounts.' },
];

type Step = 'details' | 'week';

type Done = {
  user: User;
  /** Set when the account exists but the week did not save — the coach fixes it from the client page. */
  planError: string | null;
};

/**
 * Two steps: who they are, then what their week looks like. The account is
 * created and the week written in one go at the end, so a coach who has just
 * taken a payment in the room leaves this screen with a member who can open
 * the app and see Monday.
 */
function CreateUserForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const { createUser, replacePlan } = useDirectory();

  const [step, setStep] = useState<Step>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('member');
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const detailsValid = fullName.trim().length > 1 && emailValid && password.length >= MIN_PASSWORD;
  const missing = daysMissingPrescriptions(draft);

  const submit = async () => {
    setError(null);
    if (!detailsValid || submitting) return;
    if (role === 'member' && missing.length > 0) {
      setError(`Every exercise needs a prescription. Check ${missing.map((d) => DAY_LABEL[d]).join(', ')}.`);
      return;
    }

    setSubmitting(true);
    const created = await createUser({
      full_name: fullName,
      email,
      phone: phone.trim(),
      password,
      program_id: programId,
      role,
    });

    if (!created.ok) {
      setSubmitting(false);
      setError(created.error);
      return;
    }

    let planError: string | null = null;
    if (role === 'member' && trainingDayCount(draft) > 0) {
      const saved = await replacePlan(created.value.id, draftToPayload(draft));
      if (!saved.ok) planError = saved.error;
    }
    setSubmitting(false);

    // Confirm rather than navigate away: the coach usually has to read the
    // credentials back to the client before leaving this screen.
    setDone({ user: created.value, planError });
  };

  const reset = () => {
    setDone(null);
    setStep('details');
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setProgramId(null);
    setRole('member');
    setDraft(emptyDraft());
    setError(null);
  };

  if (done) {
    return (
      <Screen scroll>
        <PageHeader title="Account created" onBack={() => router.back()} />

        <Card variant="alt" style={styles.doneCard}>
          <Ionicons
            name={done.planError ? 'alert-circle' : 'checkmark-circle'}
            size={44}
            color={done.planError ? theme.colors.danger : theme.colors.accent}
          />
          <Text variant="heading" align="center" style={styles.doneTitle}>
            {done.user.email}
          </Text>
          <Text variant="caption" color="textSecondary" align="center" style={styles.doneNote}>
            They can sign in with the email and password you set. The account is marked Invited
            until they log in for the first time.
          </Text>
          {done.planError ? (
            <Text variant="caption" color="danger" align="center" style={styles.doneNote}>
              The account exists, but the week did not save: {done.planError} Open the client and
              write it from there.
            </Text>
          ) : done.user.role === 'member' ? (
            <Text variant="caption" color="textSecondary" align="center" style={styles.doneNote}>
              {trainingDayCount(draft) === 0
                ? 'No week was written. You can add one from their page whenever you are ready.'
                : `Their week is saved: ${trainingDayCount(draft)} training day${trainingDayCount(draft) === 1 ? '' : 's'}.`}
            </Text>
          ) : null}
        </Card>

        {done.user.role === 'member' ? (
          <Button
            label={done.planError ? 'Open Client & Write Week' : 'Open Client'}
            onPress={() => router.replace(`/admin/client/${done.user.id}`)}
            style={styles.submit}
          />
        ) : null}
        <Button label="Create Another" variant="secondary" onPress={reset} style={styles.secondaryAction} />
        <Button label="Back to Clients" variant="ghost" onPress={() => router.back()} style={styles.secondaryAction} />
      </Screen>
    );
  }

  if (step === 'week') {
    return (
      <Screen scroll keyboardAvoiding>
        <PageHeader
          title={`${fullName.trim().split(' ')[0]}'s Week`}
          subtitle="Step 2 of 2 · What they do on each day."
          onBack={() => setStep('details')}
        />

        <View style={styles.editor}>
          <WeeklyPlanEditor draft={draft} onChange={setDraft} exercises={mock.exercises} routines={mock.routines} />
        </View>

        {error ? (
          <Text variant="caption" color="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          label={
            trainingDayCount(draft) === 0
              ? 'Create Account Without a Week'
              : `Create Account & Save Week`
          }
          variant={trainingDayCount(draft) === 0 ? 'secondary' : 'primary'}
          loading={submitting}
          onPress={() => void submit()}
          style={styles.submit}
        />
        <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
          {trainingDayCount(draft) === 0
            ? 'You can write the week later from their page.'
            : `${trainingDayCount(draft)} training day${trainingDayCount(draft) === 1 ? '' : 's'} · ${7 - trainingDayCount(draft)} rest`}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title="Create Client Account"
        subtitle={role === 'member' ? 'Step 1 of 2 · Who they are.' : 'Access is provisioned here — there is no public sign-up.'}
        onBack={() => router.back()}
      />

      <View style={styles.form}>
        <TextField label="FULL NAME" value={fullName} onChangeText={setFullName} placeholder="Rhea Menon" autoCapitalize="words" />
        <TextField label="EMAIL" value={email} onChangeText={setEmail} placeholder="rhea@example.com" keyboardType="email-address" autoCapitalize="none" />
        <TextField label="PHONE (OPTIONAL)" value={phone} onChangeText={setPhone} placeholder="+91 90000 00000" keyboardType="phone-pad" />
        <TextField label="TEMPORARY PASSWORD" value={password} onChangeText={setPassword} placeholder={`At least ${MIN_PASSWORD} characters`} secure autoCapitalize="none" />
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
                {active ? <Ionicons name="checkmark-sharp" size={13} color={theme.colors.onAccent} /> : null}
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

      {role === 'member' ? (
        <>
          <Text variant="heading" style={styles.sectionTitle}>
            Focus area
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.sectionNote}>
            Optional. Picks which lessons they see under Learn. What they train on is the week you
            write next.
          </Text>
          <View style={styles.options}>
            {mock.programs.map((program) => {
              const active = program.id === programId;
              return (
                <Pressable
                  key={program.id}
                  onPress={() => setProgramId(active ? null : program.id)}
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
        </>
      ) : null}

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        label={role === 'member' ? 'Next: Their Week' : 'Create Account'}
        disabled={!detailsValid}
        loading={submitting}
        onPress={role === 'member' ? () => setStep('week') : () => void submit()}
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
  sectionNote: { marginTop: -8, marginBottom: 14 },
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, padding: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  optionBody: { flex: 1, gap: 2 },
  editor: { marginTop: 20 },
  error: { marginTop: 16 },
  submit: { marginTop: 28 },
  secondaryAction: { marginTop: 10 },
  footnote: { marginTop: 18, paddingHorizontal: 16 },
  doneCard: { alignItems: 'center', paddingVertical: 36, marginTop: 24 },
  doneTitle: { marginTop: 16 },
  doneNote: { marginTop: 8, paddingHorizontal: 8 },
});
