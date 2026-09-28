import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { RequirePermission } from '@/access';
import {
  PlanDraft,
  daysMissingPrescriptions,
  draftEquals,
  draftFromPlan,
  draftToPayload,
  trainingDayCount,
} from '@/admin/planDraft';
import { adminApi } from '@/api';
import { PageHeader } from '@/components/common';
import { WeeklyPlanEditor } from '@/components/plan';
import { Button, Card, Screen, Text } from '@/components/ui';
import { DAY_LABEL, mock } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useExerciseLibrary } from '@/exercises';
import { useRemote } from '@/hooks/useRemote';

function PlanEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userById, replacePlan } = useDirectory();
  const library = useExerciseLibrary();
  const client = userById(id ?? null);

  const remote = useRemote(() => adminApi.clientPlan(id as string), [id], !!id);

  const [loaded, setLoaded] = useState<PlanDraft | null>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the editor once from the server's copy; after that the draft is the
  // coach's and a background reload must not stamp on it.
  useEffect(() => {
    if (remote.data && !draft) {
      const seeded = draftFromPlan(remote.data);
      setLoaded(seeded);
      setDraft(seeded);
    }
  }, [remote.data, draft]);

  const dirty = !!draft && !!loaded && !draftEquals(draft, loaded);
  const missing = draft ? daysMissingPrescriptions(draft) : [];

  const save = async () => {
    if (!draft || !id || saving) return;
    if (missing.length > 0) {
      setError(`Every exercise needs a prescription. Check ${missing.map((d) => DAY_LABEL[d]).join(', ')}.`);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await replacePlan(id, draftToPayload(draft));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.back();
  };

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title={client ? `${client.full_name.split(' ')[0]}'s Week` : 'Training Week'}
        subtitle="Pick a day, add exercises, say how much of each."
        onBack={() => router.back()}
      />

      {remote.error && !draft ? (
        <Card style={styles.notice}>
          <Text variant="caption" color="textSecondary" align="center">
            {remote.error}
          </Text>
          <Button label="Try again" variant="secondary" onPress={() => void remote.reload()} style={styles.retry} />
        </Card>
      ) : !draft ? (
        <Card style={styles.notice}>
          <Text variant="caption" color="textSecondary" align="center">
            Loading the week…
          </Text>
        </Card>
      ) : (
        <View style={styles.editor}>
          <WeeklyPlanEditor
            draft={draft}
            onChange={setDraft}
            exercises={library.all}
            routines={mock.routines}
          />

          {error ? (
            <Text variant="caption" color="danger" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Button
            label={
              trainingDayCount(draft) === 0
                ? 'Save as all rest days'
                : `Save week · ${trainingDayCount(draft)} training day${trainingDayCount(draft) === 1 ? '' : 's'}`
            }
            variant={trainingDayCount(draft) === 0 ? 'secondary' : 'primary'}
            disabled={!dirty}
            loading={saving}
            onPress={() => void save()}
            style={styles.save}
          />
          <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
            {dirty ? 'Unsaved changes.' : 'This is what the client sees on their home screen.'}
          </Text>
        </View>
      )}
    </Screen>
  );
}

export default function PlanScreen() {
  return (
    <RequirePermission permission="clients.assign_exercise" fallback="/(tabs)/clients">
      <PlanEditorScreen />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', paddingVertical: 28, marginTop: 24 },
  retry: { marginTop: 14 },
  editor: { marginTop: 20 },
  error: { marginTop: 16 },
  save: { marginTop: 24 },
  footnote: { marginTop: 12 },
});
