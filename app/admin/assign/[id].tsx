import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { RequirePermission } from '@/access';
import { suggestedPrescription } from '@/admin/planDraft';
import { useClientDetail } from '@/admin';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { ExercisePicker } from '@/components/plan';
import { Button, Card, Screen, Text } from '@/components/ui';
import { Exercise, mock } from '@/data';
import { useExerciseLibrary } from '@/exercises';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

type Line = { exercise: Exercise; prescription: string };

function AssignForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userById, assignExercises } = useDirectory();
  const library = useExerciseLibrary();
  const { t, localize, fonts } = useI18n();
  const { data: detail } = useClientDetail(id ?? null);

  const client = userById(id ?? null) ?? detail?.user ?? null;

  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Anything already prescribed is locked in the picker, so a coach cannot
  // create a duplicate and then wonder why the client sees one of them.
  const alreadyAssigned = useMemo(
    () => (detail?.assigned_exercises ?? []).map((row) => row.exercise_id),
    [detail]
  );
  const locked = useMemo(
    () => [...alreadyAssigned, ...lines.map((line) => line.exercise.id)],
    [alreadyAssigned, lines]
  );

  const valid = lines.length > 0 && lines.every((line) => line.prescription.trim().length > 0);

  const addSelected = (ids: string[]) => {
    const added = ids
      .map((exerciseId) => library.find(exerciseId))
      .filter((e): e is Exercise => !!e)
      .map((exercise) => ({
        exercise,
        prescription: suggestedPrescription(exercise.id, mock.routines, library.all),
      }));
    setLines((prev) => [...prev, ...added]);
    setPicking(false);
  };

  const submit = async () => {
    setError(null);
    if (!client || !valid || submitting) return;

    setSubmitting(true);
    const result = await assignExercises(
      client.id,
      lines.map((line) => ({ exercise_id: line.exercise.id, prescription: line.prescription })),
      note
    );
    setSubmitting(false);

    if (result.failed.length === 0) {
      router.back();
      return;
    }

    // Keep only what did not land, with the reason, so the coach can fix and resend.
    const failedIds = new Set(result.failed.map((f) => f.exercise_id));
    setLines((prev) => prev.filter((line) => failedIds.has(line.exercise.id)));
    const names = result.failed
      .map((f) => {
        const exercise = library.find(f.exercise_id);
        return exercise ? localize.exercise(exercise).name : f.exercise_id;
      })
      .join(t.common.listSeparator);
    setError(
      result.created.length > 0
        ? t.assign.partial(result.created.length, names, result.failed[0].error)
        : t.assign.failed(names, result.failed[0].error)
    );
  };

  if (!client) {
    return (
      <Screen scroll>
        <PageHeader title={t.assign.notFound} onBack={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title={t.assign.title}
        subtitle={t.assign.subtitle(client.full_name)}
        onBack={() => router.back()}
      />

      <Button label={t.assign.choose} onPress={() => setPicking(true)} style={styles.choose} />

      {lines.length === 0 ? (
        <Card variant="alt" style={styles.empty}>
          <Text variant="caption" color="textSecondary" align="center">
            {t.assign.empty}
          </Text>
        </Card>
      ) : (
        <View style={styles.lines}>
          {lines.map((line, index) => {
            const shown = localize.exercise(line.exercise);
            return (
              <View
                key={line.exercise.id}
                style={[
                  styles.line,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: line.prescription.trim() ? theme.colors.border : theme.colors.accentBorder,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <View style={styles.lineTop}>
                  <View style={styles.lineBody}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {shown.name}
                    </Text>
                    <Text variant="caption" color="textSecondary" numberOfLines={1}>
                      {shown.focus}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t.assign.remove(shown.name)}
                  >
                    <Ionicons name="close-circle-outline" size={22} color={theme.colors.textMuted} />
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.prescription,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.sm,
                    },
                  ]}
                >
                  <TextInput
                    value={line.prescription}
                    onChangeText={(text) =>
                      setLines((prev) => prev.map((l, i) => (i === index ? { ...l, prescription: text } : l)))
                    }
                    placeholder={t.assign.prescriptionPlaceholder}
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.prescriptionInput, { color: theme.colors.textPrimary, fontFamily: fonts.medium }]}
                    maxLength={200}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.note}>
        <TextField
          label={t.assign.note}
          value={note}
          onChangeText={setNote}
          placeholder={t.assign.notePlaceholder}
          multiline
          autoCapitalize="sentences"
          maxLength={400}
        />
      </View>

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        label={lines.length === 0 ? t.assign.assign : t.assign.assignCount(lines.length)}
        disabled={!valid}
        loading={submitting}
        onPress={() => void submit()}
        style={styles.submit}
      />
      <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
        {lines.some((line) => !line.prescription.trim())
          ? t.assign.needsPrescription
          : t.assign.clientSees}
      </Text>

      <ExercisePicker
        visible={picking}
        exercises={library.published}
        lockedIds={locked}
        title={t.assign.choose}
        onClose={() => setPicking(false)}
        onConfirm={addSelected}
      />
    </Screen>
  );
}

/** Prescribing is a coach capability, gated the same way the button is. */
export default function AssignScreen() {
  return (
    <RequirePermission permission="clients.assign_exercise" fallback="/(tabs)/clients">
      <AssignForm />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  choose: { marginTop: 24 },
  empty: { marginTop: 14, paddingVertical: 24 },
  lines: { gap: 10, marginTop: 14 },
  line: { borderWidth: 1, padding: 12, gap: 10 },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineBody: { flex: 1, gap: 2 },
  prescription: { borderWidth: 1, paddingHorizontal: 12, height: 44, justifyContent: 'center' },
  prescriptionInput: { fontSize: 14, height: '100%' },
  note: { marginTop: 24 },
  error: { marginTop: 16 },
  submit: { marginTop: 24 },
  footnote: { marginTop: 12, paddingHorizontal: 16 },
});
