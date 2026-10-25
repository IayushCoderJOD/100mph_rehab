import { useRouter } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { useCheckIns } from '@/checkin/CheckInProvider';
import { AppHeader, ThemeToggle } from '@/components/common';
import { CheckInRow, PracticeOverview, WeekStrip, WorkoutCompleteCard } from '@/components/home';
import { SessionSummaryCard } from '@/components/session';
import { Button, Card, Loader, Logo, Screen, Text } from '@/components/ui';
import { firstName } from '@/data';
import { useI18n } from '@/i18n';
import { usePlan } from '@/plan/PlanProvider';

/** Rough, for the summary card: a line of rehab work is a few minutes. */
const MINUTES_PER_EXERCISE = 6;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { week, today, hasPlan, plan, loading, error, reload, canLog } = usePlan();
  const { hasCheckedInToday, todayCheckIn } = useCheckIns();
  const { user } = useAuth();
  const { can, isAdmin } = useAccess();
  const { t } = useI18n();

  const greeting = firstName(user?.full_name) ?? t.home.greetingFallback;

  const todayPlan = today?.plan ?? [];
  const isRestDay = todayPlan.length === 0;
  const completedToday = today?.status === 'completed';

  // A day this week that had work, has passed, and was never logged. One
  // nudge, for the most recent — the strip shows the rest.
  const missed = [...week].reverse().find((d) => d.status === 'missed' && canLog(d.iso_date)) ?? null;

  return (
    <Screen scroll>
      <AppHeader
        subtitle={t.home.welcomeBack}
        title={greeting}
        center={<Logo height={width < 380 ? 26 : 34} />}
        right={<ThemeToggle />}
      />

      {isAdmin ? (
        <View style={styles.stack}>
          <PracticeOverview
            canCreateClient={can('clients.create')}
            onOpenRoster={() => router.push('/(tabs)/clients')}
            onCreateClient={() => router.push('/admin/create-user')}
            onOpenClient={(id) => router.push(`/admin/client/${id}`)}
          />
        </View>
      ) : (
        <View style={styles.stack}>
          <WeekStrip
            days={week}
            subtitle={
              plan?.updated_by_name ? t.home.writtenBy(plan.updated_by_name) : t.home.trainingPlan
            }
            onSelectDay={(day) => router.push(`/session?date=${day.iso_date}`)}
          />

          {error ? (
            <Card variant="alt" style={styles.notice}>
              <Text variant="bodyStrong" align="center">
                {t.home.loadFailed}
              </Text>
              <Text variant="caption" color="textSecondary" align="center" style={styles.noticeNote}>
                {error}
              </Text>
              <Button label={t.common.tryAgain} variant="secondary" onPress={() => void reload()} style={styles.noticeAction} />
            </Card>
          ) : loading && !plan ? (
            <Loader />
          ) : !hasPlan ? (
            <Card variant="alt" style={styles.notice}>
              <Text variant="heading" align="center">
                {t.home.notSetTitle}
              </Text>
              <Text variant="subtitle" color="textSecondary" align="center" style={styles.noticeNote}>
                {t.home.notSetNote}
              </Text>
            </Card>
          ) : completedToday ? (
            <WorkoutCompleteCard />
          ) : isRestDay ? (
            <Card variant="alt" style={styles.rest}>
              <Text variant="heading" align="center">
                {t.home.restTitle}
              </Text>
              <Text variant="subtitle" color="textSecondary" align="center" style={styles.noticeNote}>
                {t.home.restNote}
              </Text>
            </Card>
          ) : (
            <SessionSummaryCard
              kicker={t.home.todaysWorkout}
              sessionName={today ? t.home.daySession(t.days.long[today.day_of_week]) : t.home.today}
              exerciseCount={todayPlan.length}
              durationMin={todayPlan.length * MINUTES_PER_EXERCISE}
              onStart={() => router.push('/session')}
            />
          )}

          {missed && !error ? (
            <Card style={styles.missed}>
              <View style={styles.missedText}>
                <Text variant="bodyStrong">{t.home.missedTitle(t.days.long[missed.day_of_week])}</Text>
                <Text variant="caption" color="textSecondary">
                  {t.home.missedNote}
                </Text>
              </View>
              <Button
                label={t.home.logIt}
                variant="secondary"
                fullWidth={false}
                onPress={() => router.push(`/session?date=${missed.iso_date}`)}
              />
            </Card>
          ) : null}

          <CheckInRow
            completed={hasCheckedInToday}
            detail={
              todayCheckIn?.pain_score != null
                ? t.home.painLogged(todayCheckIn.pain_score)
                : undefined
            }
            onPress={() => router.push('/check-in')}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16, marginTop: 12 },
  rest: { alignItems: 'center', paddingVertical: 32 },
  notice: { alignItems: 'center', paddingVertical: 28 },
  noticeNote: { marginTop: 6, paddingHorizontal: 12 },
  noticeAction: { marginTop: 16 },
  missed: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  missedText: { flex: 1, gap: 2 },
});
