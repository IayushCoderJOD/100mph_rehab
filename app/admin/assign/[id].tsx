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
import { useDirectory } from '@/directory/DirectoryProvider';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

type Line = { exercise: Exercise; prescription: string };

function AssignForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userById, assignExercises } = useDirectory();
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
      .map((exerciseId) => mock.exercises.find((e) => e.id === exerciseId))
      .filter((e): e is Exercise => !!e)
      .map((exercise) => ({
        exercise,
        prescription: suggestedPrescription(exercise.id, mock.routines),
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
      .map((f) => mock.exercises.find((e) => e.id === f.exercise_id)?.name ?? f.exercise_id)
      .join(', ');
    setError(
      result.created.length > 0
        ? `${result.created.length} assigned. Could not assign ${names}: ${result.failed[0].error}`
        : `Could not assign ${names}: ${result.failed[0].error}`
    );
  };

  if (!client) {
    return (
      <Screen scroll>
        <PageHeader title="Client not found" onBack={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title="Assign Exercises"
        subtitle={`For ${client.full_name}, on top of their week.`}
        onBack={() => router.back()}
      />

      <Button label="Choose exercises" onPress={() => setPicking(true)} style={styles.choose} />

      {lines.length === 0 ? (
        <Card variant="alt" style={styles.empty}>
          <Text variant="caption" color="textSecondary" align="center">
            Pick one or several from the catalogue. Each gets its own prescription below.
          </Text>
        </Card>
      ) : (
        <View style={styles.lines}>
          {lines.map((line, index) => (
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
                    {line.exercise.name}
                  </Text>
                  <Text variant="caption" color="textSecondary" numberOfLines={1}>
                    {line.exercise.focus}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${line.exercise.name}`}
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
                  placeholder="Prescription, e.g. 2 x 90s holds · Both sides · Every evening"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.prescriptionInput, { color: theme.colors.textPrimary }]}
                  maxLength={200}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.note}>
        <TextField
          label="NOTE TO CLIENT (OPTIONAL)"
          value={note}
          onChangeText={setNote}
          placeholder="Why you have added these, and anything to watch for. Shown with every exercise above."
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
        label={
          lines.length === 0
            ? 'Assign'
            : `Assign ${lines.length} exercise${lines.length === 1 ? '' : 's'}`
        }
        disabled={!valid}
        loading={submitting}
        onPress={() => void submit()}
        style={styles.submit}
      />
      <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
        {lines.some((line) => !line.prescription.trim())
          ? 'Every exercise needs a prescription before you can assign.'
          : 'The client sees these under For You, with your note.'}
      </Text>

      <ExercisePicker
        visible={picking}
        exercises={mock.exercises}
        lockedIds={locked}
        title="Choose exercises"
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
  prescriptionInput: { fontFamily: fontFamily.medium, fontSize: 14, height: '100%' },
  note: { marginTop: 24 },
  error: { marginTop: 16 },
  submit: { marginTop: 24 },
  footnote: { marginTop: 12, paddingHorizontal: 16 },
});
