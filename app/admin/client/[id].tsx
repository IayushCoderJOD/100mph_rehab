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
import { Button, Card, Loader, Screen, Text } from '@/components/ui';
import { ageFrom, formatLongDate, formatShortDate, mock } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useI18n } from '@/i18n';
import { useDismiss } from '@/navigation/useDismiss';
import { useTheme } from '@/theme';

export default function AdminClientScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { removeAssignment, setUserStatus, deleteUser } = useDirectory();
  const dismiss = useDismiss('/(tabs)/clients');
  const { can } = useAccess();
  const { t, localize } = useI18n();
  const { data: detail, loading, error, reload } = useClientDetail(id ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Suspending is a two-tap action: one stray tap should not lock a client out.
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  // Deleting is the one-way version of suspending, so it gets its own confirm, spelled out.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
        <PageHeader title={loading ? '' : t.adminClient.notFound} onBack={() => router.back()} />
        {loading ? (
          <Loader />
        ) : error ? (
          <Card style={styles.empty}>
            <Text variant="caption" color="textSecondary" align="center">
              {error}
            </Text>
            <Button label={t.common.tryAgain} variant="secondary" onPress={() => void reload()} style={styles.retry} />
          </Card>
        ) : null}
      </Screen>
    );
  }

  const program = mock.programs.find((p) => p.id === client.active_program_id);
  const programName = program ? localize.program(program).name : null;
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

  const removeAccount = async () => {
    setActionError(null);
    setDeleting(true);
    const result = await deleteUser(client.id);
    if (!result.ok) {
      setDeleting(false);
      setActionError(result.error);
      return;
    }
    dismiss();
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
        subtitle={programName ? t.adminClient.focus(programName) : t.adminClient.member}
        onBack={() => router.back()}
      />

      <Card variant="alt" style={styles.headline}>
        <View style={styles.headlineTop}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            {t.adminClient.snapshot}
          </Text>
          <StatusBadge status={client.status} />
        </View>

        <SessionStats
          stats={[
            { value: summary?.latest_pain_score != null ? `${summary.latest_pain_score}` : '—', label: t.adminClient.latestPain },
            { value: weekAvg !== null ? weekAvg.toFixed(1) : '—', label: t.common.weekAvg },
            { value: `${sessionsLast7}`, label: t.adminClient.sessionsPerWeek },
          ]}
        />
        <SessionStats
          style={styles.statsRow}
          stats={[
            { value: `${summary?.current_streak ?? 0}`, label: t.common.dayStreak },
            { value: `${summary?.total_check_ins ?? 0}`, label: t.common.checkIns },
            {
              value: summary?.adherence != null ? `${Math.round(summary.adherence * 100)}%` : '—',
              label: t.common.onPlan4Weeks,
            },
          ]}
        />

        {delta !== null ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.delta}>
            {delta < 0
              ? t.adminClient.down(Math.abs(delta).toFixed(1))
              : delta > 0
                ? t.adminClient.up(delta.toFixed(1))
                : t.common.levelWithLastWeek}
          </Text>
        ) : null}

        {client.status === 'invited' ? (
          <View style={[styles.flag, { borderColor: theme.colors.border, borderRadius: theme.radius.sm }]}>
            <Text variant="caption" color="textSecondary">
              {t.adminClient.invited(formatLongDate(client.member_since))}
            </Text>
          </View>
        ) : quietDays === null ? (
          <View style={[styles.flag, { borderColor: theme.colors.accentBorder, borderRadius: theme.radius.sm }]}>
            <Text variant="caption" color="accentText">
              {t.adminClient.neverCheckedIn}
            </Text>
          </View>
        ) : quietDays >= 4 ? (
          <View style={[styles.flag, { borderColor: theme.colors.accentBorder, borderRadius: theme.radius.sm }]}>
            <Text variant="caption" color="accentText">
              {t.adminClient.quiet(quietDays)}
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
          {t.adminClient.trainingWeek}
        </Text>
        {can('clients.assign_exercise') ? (
          <Button
            label={
              detail?.plan && Object.values(detail.plan.days).some((d) => d.length > 0)
                ? t.adminClient.editWeek
                : t.adminClient.writeWeek
            }
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
            {t.common.painTrend}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.blockNote}>
            {t.common.lastCheckIns(trend.length)}
          </Text>
          <View style={styles.chart}>
            <PainTrendChart points={trend} height={180} />
          </View>
        </Card>
      ) : null}

      {/* ---- Prescriptions on top of the week ---- */}
      <View style={styles.sectionHead}>
        <Text variant="heading" style={styles.sectionHeadTitle}>
          {t.adminClient.prescribed}
        </Text>
        {can('clients.assign_exercise') ? (
          <Button
            label={t.adminClient.assign}
            variant="secondary"
            fullWidth={false}
            onPress={() => router.push(`/admin/assign/${client.id}`)}
          />
        ) : null}
      </View>

      {assignments.length === 0 ? (
        <Card style={styles.emptyBlock}>
          <Text variant="caption" color="textSecondary" align="center">
            {t.adminClient.nothingPrescribed}
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {assignments.map((row) => (
            <AssignedExerciseCard
              key={row.id}
              assignment={row}
              exercise={row.exercise!}
              assignedByName={row.assigned_by_name || t.adminClient.staff}
              onRemove={can('clients.assign_exercise') ? () => void withdraw(row.id) : undefined}
            />
          ))}
        </View>
      )}

      {/* ---- What they logged ---- */}
      <Text variant="heading" style={styles.sectionTitle}>
        {t.common.recentCheckIns}
      </Text>
      <Card style={styles.logCard}>
        {checkIns.length === 0 ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.logEmpty}>
            {t.adminClient.noCheckIns}
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
                  {entry.pain_location ?? t.common.noLocation}
                </Text>
                <Text variant="bodyStrong">{entry.pain_score ?? '—'}</Text>
              </View>
            ))
        )}
      </Card>

      <Text variant="heading" style={styles.sectionTitle}>
        {t.adminClient.recentSessions}
      </Text>
      <Card style={styles.logCard}>
        {sessions.length === 0 ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.logEmpty}>
            {t.adminClient.noSessions}
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
                  {session.source === 'guided' ? t.adminClient.guided : t.adminClient.logged}
                  {total > 0 ? t.adminClient.ofExercises(done, total) : ''}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      {/* ---- The person ---- */}
      <Text variant="heading" style={styles.sectionTitle}>
        {t.adminClient.account}
      </Text>
      <Card style={styles.details}>
        <DetailRow label={t.common.email} value={client.email} />
        <DetailRow label={t.common.phone} value={client.phone || '—'} />
        <DetailRow label={t.common.age} value={age !== null ? `${age}` : t.common.notGiven} />
        <DetailRow
          label={t.common.height}
          value={client.height_cm != null ? t.common.cm(client.height_cm) : t.common.notGiven}
        />
        <DetailRow
          label={t.common.weight}
          value={client.weight_kg != null ? t.common.kg(client.weight_kg) : t.common.notGiven}
        />
        {programName ? <DetailRow label={t.adminClient.focusArea} value={programName} /> : null}
        <DetailRow label={t.common.joined} value={formatLongDate(client.member_since)} last />
      </Card>

      {can('clients.manage_status') ? (
        <View style={styles.actions}>
          {resetDone ? (
            <Text variant="caption" color="accentText">
              {t.adminClient.resetDone(client.full_name)}
            </Text>
          ) : null}

          {resetOpen ? (
            <Card style={styles.resetCard}>
              <TextField
                label={t.adminClient.tempPassword}
                value={tempPassword}
                onChangeText={setTempPassword}
                placeholder={t.adminClient.tempPlaceholder}
                autoComplete="off"
              />
              <Text variant="caption" color="textMuted">
                {t.adminClient.resetNote}
              </Text>
              <View style={styles.resetButtons}>
                <Button
                  label={t.adminClient.cancel}
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => {
                    setResetOpen(false);
                    setTempPassword('');
                  }}
                />
                <Button
                  label={t.adminClient.setPassword}
                  fullWidth={false}
                  disabled={tempPassword.length < 8}
                  loading={resetting}
                  onPress={() => void resetPassword()}
                />
              </View>
            </Card>
          ) : (
            <Button
              label={t.adminClient.resetPassword}
              variant="secondary"
              onPress={() => {
                setResetDone(false);
                setTempPassword('');
                setResetOpen(true);
              }}
            />
          )}

          {client.status === 'suspended' ? (
            <Button label={t.adminClient.reactivate} onPress={() => void changeStatus('active')} />
          ) : confirmSuspend ? (
            <View style={styles.resetButtons}>
              <Button label={t.adminClient.keepActive} variant="ghost" fullWidth={false} onPress={() => setConfirmSuspend(false)} />
              <Button
                label={t.adminClient.suspendName(client.full_name.split(' ')[0])}
                fullWidth={false}
                onPress={() => void changeStatus('suspended')}
              />
            </View>
          ) : (
            <Button label={t.adminClient.suspend} variant="secondary" onPress={() => setConfirmSuspend(true)} />
          )}

          {confirmDelete ? (
            <Card style={styles.resetCard}>
              <Text variant="bodyStrong">{t.adminClient.deleteTitle(client.full_name)}</Text>
              <Text variant="caption" color="textSecondary">
                {t.adminClient.deleteNote}
              </Text>
              <View style={styles.resetButtons}>
                <Button
                  label={t.adminClient.keepAccount}
                  variant="ghost"
                  fullWidth={false}
                  disabled={deleting}
                  onPress={() => setConfirmDelete(false)}
                />
                <Button
                  label={t.adminClient.deleteForGood}
                  variant="danger"
                  fullWidth={false}
                  loading={deleting}
                  onPress={() => void removeAccount()}
                />
              </View>
            </Card>
          ) : (
            <Button label={t.adminClient.deleteAccount} variant="danger" onPress={() => setConfirmDelete(true)} />
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
