import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { checkInsFor, clientStats } from '@/admin';
import { useAccess } from '@/access';
import { StatusBadge } from '@/components/admin';
import { PainTrendChart } from '@/components/charts';
import { PageHeader } from '@/components/common';
import { AssignedExerciseCard } from '@/components/plan';
import { SessionStats } from '@/components/session';
import { DetailRow } from '@/components/settings';
import { Button, Card, Screen, Text } from '@/components/ui';
import { findExercise, formatLongDate, formatShortDate, mock } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { getProgramData } from '@/program/programData';
import { useTheme } from '@/theme';

export default function AdminClientScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userById, assignmentsFor, removeAssignment, setUserStatus } = useDirectory();
  const { can } = useAccess();

  const client = userById(id ?? null);

  // The client's own program decides which exercises their assignments can
  // point at, not whichever program the coach happens to be on.
  const programData = useMemo(
    () => getProgramData(client?.active_program_id ?? null),
    [client?.active_program_id]
  );

  const stats = useMemo(() => (client ? clientStats(client.id) : null), [client]);
  const checkIns = useMemo(() => (client ? checkInsFor(client.id) : []), [client]);

  const assignments = useMemo(() => {
    if (!client) return [];

    return assignmentsFor(client.id).flatMap((assignment) => {
      const exercise = findExercise(programData.exercises, assignment.exercise_id);
      if (!exercise) return [];
      return [{ assignment, exercise }];
    });
  }, [client, assignmentsFor, programData.exercises]);

  if (!client || !stats) {
    return (
      <Screen scroll>
        <PageHeader title="Client not found" onBack={() => router.back()} />
      </Screen>
    );
  }

  const trend = checkIns
    .filter((entry) => entry.pain_score !== null)
    .slice(-14)
    .map((entry) => ({ date: entry.date, score: entry.pain_score ?? 0 }));

  const programName =
    mock.programs.find((p) => p.id === client.active_program_id)?.name ?? 'No program';

  return (
    <Screen scroll>
      <PageHeader title={client.full_name} subtitle={programName} onBack={() => router.back()} />

      <Card variant="alt" style={styles.headline}>
        <View style={styles.headlineTop}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            Snapshot
          </Text>
          <StatusBadge status={client.status} />
        </View>

        <SessionStats
          stats={[
            { value: stats.latestPain != null ? `${stats.latestPain}` : '—', label: 'Latest pain' },
            { value: stats.weekAvg !== null ? stats.weekAvg.toFixed(1) : '—', label: '7-day avg' },
            { value: `${stats.sessionsLast7}`, label: 'Sessions / wk' },
          ]}
        />

        {stats.delta !== null ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.delta}>
            {stats.delta < 0
              ? `Down ${Math.abs(stats.delta).toFixed(1)} on the week before.`
              : stats.delta > 0
                ? `Up ${stats.delta.toFixed(1)} on the week before.`
                : 'Level with the week before.'}
          </Text>
        ) : null}

        {client.status === 'invited' ? (
          <View
            style={[
              styles.flag,
              { borderColor: theme.colors.border, borderRadius: theme.radius.sm },
            ]}
          >
            <Text variant="caption" color="textSecondary">
              Account created on {formatLongDate(client.member_since)}. They have not signed in
              yet, so there is nothing to track.
            </Text>
          </View>
        ) : stats.needsAttention ? (
          <View
            style={[
              styles.flag,
              { borderColor: theme.colors.accentBorder, borderRadius: theme.radius.sm },
            ]}
          >
            <Text variant="caption" color="accentText">
              {stats.daysSinceCheckIn === null
                ? 'Signed in but has never checked in. Worth a call.'
                : `No check-in for ${stats.daysSinceCheckIn} days. Worth a nudge.`}
            </Text>
          </View>
        ) : null}
      </Card>

      {trend.length > 1 ? (
        <Card style={styles.block}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            Pain Trend
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.blockNote}>
            Last {trend.length} check-ins · lower is better
          </Text>
          <View style={styles.chart}>
            <PainTrendChart points={trend} height={180} />
          </View>
        </Card>
      ) : null}

      <View style={styles.sectionHead}>
        <Text variant="heading" style={styles.sectionHeadTitle}>
          Prescribed Exercises
        </Text>
        {can('clients.assign_exercise') ? (
          <Button
            label="Assign"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.push(`/admin/assign/${client.id}`)}
          />
        ) : null}
      </View>

      {assignments.length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="caption" color="textSecondary" align="center">
            Nothing prescribed beyond the program yet.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {assignments.map(({ assignment, exercise }) => (
            <AssignedExerciseCard
              key={assignment.id}
              assignment={assignment}
              exercise={exercise}
              assignedByName={userById(assignment.assigned_by)?.full_name ?? 'Staff'}
              onRemove={
                can('clients.assign_exercise') ? () => removeAssignment(assignment.id) : undefined
              }
            />
          ))}
        </View>
      )}

      <Text variant="heading" style={styles.sectionTitle}>
        Recent Check-Ins
      </Text>
      <Card style={styles.logCard}>
        {checkIns.length === 0 ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.logEmpty}>
            No check-ins logged.
          </Text>
        ) : (
          [...checkIns]
            .reverse()
            .slice(0, 8)
            .map((entry, index) => (
              <View
                key={entry.date}
                style={[
                  styles.logRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border },
                ]}
              >
                <Text variant="bodyStrong" style={styles.logDate}>
                  {formatShortDate(entry.date)}
                </Text>
                <Text variant="caption" color="textSecondary" style={styles.logNote} numberOfLines={2}>
                  {entry.pain_location ?? 'No location noted.'}
                </Text>
                <Text variant="bodyStrong">{entry.pain_score ?? '—'}</Text>
              </View>
            ))
        )}
      </Card>

      <Text variant="heading" style={styles.sectionTitle}>
        Account
      </Text>
      <Card style={styles.details}>
        <DetailRow label="Email" value={client.email} />
        <DetailRow label="Phone" value={client.phone} />
        <DetailRow label="Program" value={programName} />
        <DetailRow label="Joined" value={formatLongDate(client.member_since)} last />
      </Card>

      {can('clients.manage_status') ? (
        <View style={styles.actions}>
          {client.status === 'suspended' ? (
            <Button
              label="Reactivate Account"
              onPress={() => void setUserStatus(client.id, 'active')}
            />
          ) : (
            <Button
              label="Suspend Account"
              variant="secondary"
              onPress={() => void setUserStatus(client.id, 'suspended')}
            />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { marginTop: 24 },
  headlineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2 },
  delta: { marginTop: 16 },
  flag: { borderWidth: 1, padding: 12, marginTop: 16 },
  block: { marginTop: 16 },
  blockNote: { marginTop: 4 },
  chart: { marginTop: 16 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
    marginBottom: 12,
  },
  sectionHeadTitle: { flex: 1 },
  sectionTitle: { marginTop: 32, marginBottom: 12 },
  list: { gap: 14 },
  empty: { paddingVertical: 24 },
  logCard: { paddingVertical: 0 },
  logEmpty: { paddingVertical: 20 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  logDate: { width: 60 },
  logNote: { flex: 1 },
  details: { paddingVertical: 4 },
  actions: { marginTop: 28 },
});
