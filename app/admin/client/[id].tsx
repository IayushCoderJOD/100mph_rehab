import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useClientDetail } from '@/admin';
import { adminApi, messageFor } from '@/api';
import { useAccess } from '@/access';
import { StatusBadge, daysSince } from '@/components/admin';
import { PainTrendChart } from '@/components/charts';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { AssignedExerciseCard, WeekOverview } from '@/components/plan';
import { SessionStats } from '@/components/session';
import { DetailRow } from '@/components/settings';
import { Button, Card, Screen, Text } from '@/components/ui';
import { ageFrom, formatLongDate, formatShortDate, mock } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useTheme } from '@/theme';

export default function AdminClientScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { removeAssignment, setUserStatus } = useDirectory();
  const { can } = useAccess();
  const { data: detail, loading, error, reload } = useClientDetail(id ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Suspending is a two-tap action: one stray tap should not lock a client out.
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Re-read on every return to this screen: the week editor and the assign
  // form both write, and the coach lands back here expecting to see it.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const client = detail?.user ?? null;
  const summary = detail?.summary ?? null;

  const checkIns = useMemo(
    () => [...(detail?.recent_check_ins ?? [])].sort((a, b) => (a.local_date < b.local_date ? -1 : 1)),
    [detail]
  );
  const trend = checkIns
    .filter((entry) => entry.pain_score !== null)
    .slice(-14)
    .map((entry) => ({ date: entry.local_date, score: entry.pain_score ?? 0 }));

  const scored = checkIns.filter((entry) => entry.pain_score !== null);
  const mean = (rows: typeof scored) =>
    rows.length === 0 ? null : rows.reduce((sum, e) => sum + (e.pain_score ?? 0), 0) / rows.length;
  const weekAvg = mean(scored.slice(-7));
  const previousAvg = mean(scored.slice(-14, -7));
  const delta = weekAvg !== null && previousAvg !== null ? weekAvg - previousAvg : null;

  const sessions = useMemo(
    () => [...(detail?.recent_sessions ?? [])].sort((a, b) => (a.local_date > b.local_date ? -1 : 1)),
    [detail]
  );
  const sessionsLast7 = sessions.filter((s) => (daysSince(s.local_date) ?? 99) < 7).length;
  const quietDays = daysSince(summary?.latest_check_in_date ?? null);

  if (!client) {
    return (
      <Screen scroll>
        <PageHeader title={loading ? 'Loading…' : 'Client not found'} onBack={() => router.back()} />
        {error ? (
          <Card style={styles.empty}>
            <Text variant="caption" color="textSecondary" align="center">
              {error}
            </Text>
            <Button label="Try again" variant="secondary" onPress={() => void reload()} style={styles.retry} />
          </Card>
        ) : null}
      </Screen>
    );
  }

  const programName = mock.programs.find((p) => p.id === client.active_program_id)?.name ?? null;
  const age = ageFrom(client.date_of_birth);
  const assignments = (detail?.assigned_exercises ?? []).filter((row) => row.exercise !== null);

  const withdraw = async (assignmentId: string) => {
    setActionError(null);
    const result = await removeAssignment(client.id, assignmentId);
    if (!result.ok) setActionError(result.error);
    else void reload();
  };

  const changeStatus = async (status: 'active' | 'suspended') => {
    setActionError(null);
    setConfirmSuspend(false);
    const result = await setUserStatus(client.id, status);
    if (!result.ok) setActionError(result.error);
    else void reload();
  };

  // The way back in for a client who forgot their password: email reset is
  // not wired up, so the coach sets a new temporary one and tells them.
  const resetPassword = async () => {
    if (tempPassword.length < 8 || resetting) return;
    setActionError(null);
    setResetting(true);
    try {
      await adminApi.setUserPassword(client.id, tempPassword);
      setResetDone(true);
      setResetOpen(false);
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader
        title={client.full_name}
        subtitle={programName ? `Focus: ${programName}` : 'Member'}
        onBack={() => router.back()}
      />

      <Card variant="alt" style={styles.headline}>
        <View style={styles.headlineTop}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            Snapshot
          </Text>
          <StatusBadge status={client.status} />
        </View>

        <SessionStats
          stats={[
            { value: summary?.latest_pain_score != null ? `${summary.latest_pain_score}` : '—', label: 'Latest pain' },
            { value: weekAvg !== null ? weekAvg.toFixed(1) : '—', label: '7-day avg' },
            { value: `${sessionsLast7}`, label: 'Sessions / wk' },
          ]}
        />
        <SessionStats
          style={styles.statsRow}
          stats={[
            { value: `${summary?.current_streak ?? 0}`, label: 'Day streak' },
            { value: `${summary?.total_check_ins ?? 0}`, label: 'Check-ins' },
            {
              value: summary?.adherence != null ? `${Math.round(summary.adherence * 100)}%` : '—',
              label: 'On plan · 4 wks',
            },
          ]}
        />

        {delta !== null ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.delta}>
            {delta < 0
              ? `Down ${Math.abs(delta).toFixed(1)} on the week before.`
              : delta > 0
                ? `Up ${delta.toFixed(1)} on the week before.`
                : 'Level with the week before.'}
          </Text>
        ) : null}

        {client.status === 'invited' ? (
          <View style={[styles.flag, { borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}>
            <Text variant="caption" color="textSecondary">
              Account created on {formatLongDate(client.member_since)}. They have not signed in yet, so
              there is nothing to track.
            </Text>
          </View>
        ) : quietDays === null ? (
          <View style={[styles.flag, { borderColor: theme.colors.accentBorder, borderRadius: theme.radius.sm }]}>
            <Text variant="caption" color="accentText">
              Signed in but has never checked in. Worth a call.
            </Text>
          </View>
        ) : quietDays >= 4 ? (
          <View style={[styles.flag, { borderColor: theme.colors.accentBorder, borderRadius: theme.radius.sm }]}>
            <Text variant="caption" color="accentText">
              No check-in for {quietDays} days. Worth a nudge.
            </Text>
          </View>
        ) : null}
      </Card>

      {actionError ? (
        <Text variant="caption" color="danger" style={styles.actionError}>
          {actionError}
        </Text>
      ) : null}

      {/* ---- The week ---- */}
      <View style={styles.sectionHead}>
        <Text variant="heading" style={styles.sectionHeadTitle}>
          Training Week
        </Text>
        {can('clients.assign_exercise') ? (
          <Button
            label={detail?.plan && Object.values(detail.plan.days).some((d) => d.length > 0) ? 'Edit week' : 'Write week'}
            variant="secondary"
            fullWidth={false}
            onPress={() => router.push(`/admin/plan/${client.id}`)}
          />
        ) : null}
      </View>
      <WeekOverview
        plan={detail?.plan ?? null}
        onPress={can('clients.assign_exercise') ? () => router.push(`/admin/plan/${client.id}`) : undefined}
      />

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

      {/* ---- Prescriptions on top of the week ---- */}
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
        <Card style={styles.emptyBlock}>
          <Text variant="caption" color="textSecondary" align="center">
            Nothing prescribed beyond the week yet.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {assignments.map((row) => (
            <AssignedExerciseCard
              key={row.id}
              assignment={row}
              exercise={row.exercise!}
              assignedByName={row.assigned_by_name || 'Staff'}
              onRemove={can('clients.assign_exercise') ? () => void withdraw(row.id) : undefined}
            />
          ))}
        </View>
      )}

      {/* ---- What they logged ---- */}
      <Text variant="heading" style={styles.sectionTitle}>
        Recent Check-Ins
      </Text>
      <Card style={styles.logCard}>
        {checkIns.length === 0 ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.logEmpty}>
            No check-ins in the last 30 days.
          </Text>
        ) : (
          [...checkIns]
            .reverse()
            .slice(0, 8)
            .map((entry, index) => (
              <View
                key={entry.local_date}
                style={[styles.logRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
              >
                <Text variant="bodyStrong" style={styles.logDate}>
                  {formatShortDate(entry.local_date)}
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
        Recent Sessions
      </Text>
      <Card style={styles.logCard}>
        {sessions.length === 0 ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.logEmpty}>
            No sessions logged in the last 30 days.
          </Text>
        ) : (
          sessions.slice(0, 8).map((session, index) => {
            const done = session.completed_exercises.filter((e) => e.completed).length;
            const total = session.completed_exercises.length;
            return (
              <View
                key={session.id}
                style={[styles.logRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
              >
                <Text variant="bodyStrong" style={styles.logDate}>
                  {formatShortDate(session.local_date)}
                </Text>
                <Text variant="caption" color="textSecondary" style={styles.logNote} numberOfLines={1}>
                  {session.source === 'guided' ? 'Guided' : 'Logged'}
                  {total > 0 ? ` · ${done} of ${total} exercises` : ''}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      {/* ---- The person ---- */}
      <Text variant="heading" style={styles.sectionTitle}>
        Account
      </Text>
      <Card style={styles.details}>
        <DetailRow label="Email" value={client.email} />
        <DetailRow label="Phone" value={client.phone || '—'} />
        <DetailRow label="Age" value={age !== null ? `${age}` : 'Not given'} />
        <DetailRow label="Height" value={client.height_cm != null ? `${client.height_cm} cm` : 'Not given'} />
        <DetailRow label="Weight" value={client.weight_kg != null ? `${client.weight_kg} kg` : 'Not given'} />
        {programName ? <DetailRow label="Focus area" value={programName} /> : null}
        <DetailRow label="Joined" value={formatLongDate(client.member_since)} last />
      </Card>

      {can('clients.manage_status') ? (
        <View style={styles.actions}>
          {resetDone ? (
            <Text variant="caption" color="accentText">
              New password set. Tell {client.full_name} what it is — they have been signed out everywhere
              and can change it from My Account once they are back in.
            </Text>
          ) : null}

          {resetOpen ? (
            <Card style={styles.resetCard}>
              <TextField
                label="NEW TEMPORARY PASSWORD"
                value={tempPassword}
                onChangeText={setTempPassword}
                placeholder="At least 8 characters"
                autoComplete="off"
              />
              <Text variant="caption" color="textMuted">
                Their current password stops working and every device they are signed in on is signed out.
              </Text>
              <View style={styles.resetButtons}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => {
                    setResetOpen(false);
                    setTempPassword('');
                  }}
                />
                <Button
                  label="Set Password"
                  fullWidth={false}
                  disabled={tempPassword.length < 8}
                  loading={resetting}
                  onPress={() => void resetPassword()}
                />
              </View>
            </Card>
          ) : (
            <Button
              label="Reset Password"
              variant="secondary"
              onPress={() => {
                setResetDone(false);
                setTempPassword('');
                setResetOpen(true);
              }}
            />
          )}

          {client.status === 'suspended' ? (
            <Button label="Reactivate Account" onPress={() => void changeStatus('active')} />
          ) : confirmSuspend ? (
            <View style={styles.resetButtons}>
              <Button label="Keep Active" variant="ghost" fullWidth={false} onPress={() => setConfirmSuspend(false)} />
              <Button
                label={`Suspend ${client.full_name.split(' ')[0]}`}
                fullWidth={false}
                onPress={() => void changeStatus('suspended')}
              />
            </View>
          ) : (
            <Button label="Suspend Account" variant="secondary" onPress={() => setConfirmSuspend(true)} />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { marginTop: 24 },
  headlineTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2 },
  statsRow: { marginTop: 20 },
  delta: { marginTop: 16 },
  flag: { borderWidth: 1, padding: 12, marginTop: 16 },
  actionError: { marginTop: 16 },
  block: { marginTop: 16 },
  blockNote: { marginTop: 4 },
  chart: { marginTop: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 32, marginBottom: 12 },
  sectionHeadTitle: { flex: 1 },
  sectionTitle: { marginTop: 32, marginBottom: 12 },
  list: { gap: 14 },
  empty: { alignItems: 'center', paddingVertical: 24, marginTop: 24 },
  emptyBlock: { paddingVertical: 24 },
  retry: { marginTop: 16 },
  logCard: { paddingVertical: 0 },
  logEmpty: { paddingVertical: 20 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  logDate: { width: 60 },
  logNote: { flex: 1 },
  details: { paddingVertical: 4 },
  actions: { marginTop: 28, gap: 12 },
  resetCard: { gap: 12 },
  resetButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
