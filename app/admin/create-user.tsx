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
import { User, UserRole, mock } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useExerciseLibrary } from '@/exercises';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

const MIN_PASSWORD = 8;

const ROLES: UserRole[] = ['member', 'admin'];

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
  const library = useExerciseLibrary();
  const { t, localize } = useI18n();

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
      setError(t.common.missingPrescriptions(missing.map((d) => t.days.long[d]).join(t.common.listSeparator)));
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
        <PageHeader title={t.createUser.created} onBack={() => router.back()} />

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
            {t.createUser.createdNote}
          </Text>
          {done.planError ? (
            <Text variant="caption" color="danger" align="center" style={styles.doneNote}>
              {t.createUser.planFailed(done.planError)}
            </Text>
          ) : done.user.role === 'member' ? (
            <Text variant="caption" color="textSecondary" align="center" style={styles.doneNote}>
              {trainingDayCount(draft) === 0 ? t.createUser.noWeek : t.createUser.weekSaved(trainingDayCount(draft))}
            </Text>
          ) : null}
        </Card>

        {done.user.role === 'member' ? (
          <Button
            label={done.planError ? t.createUser.openClientWrite : t.createUser.openClient}
            onPress={() => router.replace(`/admin/client/${done.user.id}`)}
            style={styles.submit}
          />
        ) : null}
        <Button label={t.createUser.another} variant="secondary" onPress={reset} style={styles.secondaryAction} />
        <Button label={t.createUser.back} variant="ghost" onPress={() => router.back()} style={styles.secondaryAction} />
      </Screen>
    );
  }

  if (step === 'week') {
    return (
      <Screen scroll keyboardAvoiding>
        <PageHeader
          title={t.createUser.weekTitle(fullName.trim().split(' ')[0])}
          subtitle={t.createUser.step2}
          onBack={() => setStep('details')}
        />

        <View style={styles.editor}>
          <WeeklyPlanEditor draft={draft} onChange={setDraft} exercises={library.all} routines={mock.routines} />
        </View>

        {error ? (
          <Text variant="caption" color="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          label={trainingDayCount(draft) === 0 ? t.createUser.createWithoutWeek : t.createUser.createAndSave}
          variant={trainingDayCount(draft) === 0 ? 'secondary' : 'primary'}
          loading={submitting}
          onPress={() => void submit()}
          style={styles.submit}
        />
        <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
          {trainingDayCount(draft) === 0 ? t.createUser.laterNote : t.common.daySplit(trainingDayCount(draft))}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title={t.createUser.title}
        subtitle={role === 'member' ? t.createUser.step1 : t.createUser.adminSub}
        onBack={() => router.back()}
      />

      <View style={styles.form}>
        <TextField label={t.createUser.fullName} value={fullName} onChangeText={setFullName} placeholder="Rhea Menon" autoCapitalize="words" />
        <TextField label={t.createUser.email} value={email} onChangeText={setEmail} placeholder="rhea@example.com" keyboardType="email-address" autoCapitalize="none" />
        <TextField label={t.createUser.phone} value={phone} onChangeText={setPhone} placeholder="+91 90000 00000" keyboardType="phone-pad" />
        <TextField
          label={t.createUser.tempPassword}
          value={password}
          onChangeText={setPassword}
          placeholder={t.createUser.passwordPlaceholder(MIN_PASSWORD)}
          secure
          autoCapitalize="none"
        />
      </View>

      <Text variant="heading" style={styles.sectionTitle}>
        {t.createUser.role}
      </Text>
      <View style={styles.options}>
        {ROLES.map((value) => {
          const active = value === role;
          const option = t.createUser.roles[value];
          return (
            <Pressable
              key={value}
              onPress={() => setRole(value)}
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
            {t.createUser.focusArea}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.sectionNote}>
            {t.createUser.focusNote}
          </Text>
          <View style={styles.options}>
            {mock.programs.map(localize.program).map((program) => {
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
        label={role === 'member' ? t.createUser.next : t.createUser.create}
        disabled={!detailsValid}
        loading={submitting}
        onPress={role === 'member' ? () => setStep('week') : () => void submit()}
        style={styles.submit}
      />

      <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
        {t.createUser.footnote}
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
