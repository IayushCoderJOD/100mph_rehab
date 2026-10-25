import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { assignmentApi } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { AssignedExerciseCard } from '@/components/plan';
import { Button, Card, HeartBadge, Loader, Screen, Text } from '@/components/ui';
import { useRemote } from '@/hooks/useRemote';
import { useI18n } from '@/i18n';

/**
 * What the client's physio has prescribed for them specifically, on top of
 * the week. Read from the server on every visit — a prescription written in
 * the clinic an hour ago has to be here now.
 */
export default function PlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, loading, error, reload } = useRemote(() => assignmentApi.mine(), [user?.id], !!user);

  const items = (data ?? []).filter((row) => row.exercise !== null);

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        {t.forYou.title}
      </Text>

      {error ? (
        <Card style={styles.empty}>
          <Text variant="heading" align="center">
            {t.forYou.loadFailed}
          </Text>
          <Text variant="caption" color="textSecondary" align="center" style={styles.emptyNote}>
            {error}
          </Text>
          <Button label={t.common.tryAgain} variant="secondary" onPress={() => void reload()} style={styles.retry} />
        </Card>
      ) : loading ? (
        <Loader />
      ) : items.length === 0 ? (
        <Card style={styles.empty}>
          <HeartBadge size={72} />
          <Text variant="heading" align="center" style={styles.emptyTitle}>
            {t.forYou.emptyTitle}
          </Text>
          <Text variant="subtitle" color="textSecondary" align="center" style={styles.emptyNote}>
            {t.forYou.emptyNote}
          </Text>
        </Card>
      ) : (
        <>
          <Text variant="subtitle" color="textSecondary" style={styles.intro}>
            {t.forYou.intro}
          </Text>

          <View style={styles.list}>
            {items.map((row) => (
              <AssignedExerciseCard
                key={row.id}
                assignment={row}
                exercise={row.exercise!}
                assignedByName={row.assigned_by_name || t.common.yourPhysio}
                onGuide={() => router.push(`/exercise/${row.exercise!.id}`)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { marginTop: 12, marginBottom: 24 },
  intro: { marginBottom: 20 },
  list: { gap: 14 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { marginTop: 20 },
  emptyNote: { marginTop: 6, paddingHorizontal: 8 },
  retry: { marginTop: 16 },
});
