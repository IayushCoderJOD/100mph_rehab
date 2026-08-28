import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { Button, Card, Screen, Text } from '@/components/ui';
import { Exercise } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { getProgramData } from '@/program/programData';
import { useTheme } from '@/theme';

export default function AssignExerciseScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { userById, assignmentsFor, assignExercise } = useDirectory();

  const client = userById(id ?? null);
  const programData = useMemo(
    () => getProgramData(client?.active_program_id ?? null),
    [client?.active_program_id]
  );

  const [selected, setSelected] = useState<Exercise | null>(null);
  const [prescription, setPrescription] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Anything already prescribed is off the list, so a coach cannot create a
  // duplicate and then wonder why the client sees one of them.
  const alreadyAssigned = useMemo(
    () => new Set(client ? assignmentsFor(client.id).map((a) => a.exercise_id) : []),
    [client, assignmentsFor]
  );

  const available = programData.exercises.filter((e) => !alreadyAssigned.has(e.id));
  const valid = !!selected && prescription.trim().length > 0;

  if (!client) {
    return (
      <Screen scroll>
        <PageHeader title="Client not found" onBack={() => router.back()} />
      </Screen>
    );
  }

  const submit = () => {
    if (!valid || !user) return;

    const result = assignExercise({
      user_id: client.id,
      exercise_id: selected.id,
      assigned_by: user.id,
      prescription,
      note,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.back();
  };

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title="Assign Exercise"
        subtitle={`Prescribed to ${client.full_name} on top of their program.`}
        onBack={() => router.back()}
      />

      <Text variant="heading" style={styles.sectionTitle}>
        1 · Pick the exercise
      </Text>

      {available.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="caption" color="textSecondary" align="center">
            Every exercise in this program is already assigned to {client.full_name}.
          </Text>
        </Card>
      ) : (
        <View style={styles.options}>
          {available.map((exercise) => {
            const active = selected?.id === exercise.id;

            return (
              <Pressable
                key={exercise.id}
                onPress={() => setSelected(exercise)}
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
                  <Text variant="bodyStrong">{exercise.name}</Text>
                  <Text variant="caption" color="textSecondary">
                    {exercise.focus}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text variant="heading" style={styles.sectionTitle}>
        2 · What are you asking for?
      </Text>
      <TextField
        label="PRESCRIPTION"
        value={prescription}
        onChangeText={setPrescription}
        placeholder="e.g. 2 x 90s holds · Both sides · Every evening"
        autoCapitalize="sentences"
      />

      <View style={styles.field}>
        <TextField
          label="NOTE TO CLIENT (OPTIONAL)"
          value={note}
          onChangeText={setNote}
          placeholder="Why you are adding this, and what to watch for."
          autoCapitalize="sentences"
          multiline
          maxLength={400}
        />
      </View>

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button label="Assign Exercise" disabled={!valid} onPress={submit} style={styles.submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  field: { marginTop: 18 },
  error: { marginTop: 14 },
  submit: { marginTop: 28 },
  empty: { paddingVertical: 24 },
});
