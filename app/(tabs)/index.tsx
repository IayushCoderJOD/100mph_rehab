import { useRouter } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { useCheckIns } from '@/checkin/CheckInProvider';
import { AppHeader, ThemeToggle } from '@/components/common';
import { CheckInRow, PracticeOverview, WeekStrip, WorkoutCompleteCard } from '@/components/home';
import { SessionSummaryCard } from '@/components/session';
import { Button, Card, Loader, Logo, Screen, Text } from '@/components/ui';
import { DAY_LABEL, firstName } from '@/data';
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

  const greeting = firstName(user?.full_name) ?? 'there';

  const todayPlan = today?.plan ?? [];
  const isRestDay = todayPlan.length === 0;
  const completedToday = today?.status === 'completed';

  // A day this week that had work, has passed, and was never logged. One
  // nudge, for the most recent — the strip shows the rest.
  const missed = [...week].reverse().find((d) => d.status === 'missed' && canLog(d.iso_date)) ?? null;

  return (
    <Screen scroll>
      <AppHeader
        subtitle="Welcome back"
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
              plan?.updated_by_name ? `Written by ${plan.updated_by_name}` : 'Your Training Plan'
            }
            onSelectDay={(day) => router.push(`/session?date=${day.iso_date}`)}
          />

          {error ? (
            <Card variant="alt" style={styles.notice}>
              <Text variant="bodyStrong" align="center">
                Could not load your week
              </Text>
              <Text variant="caption" color="textSecondary" align="center" style={styles.noticeNote}>
                {error}
              </Text>
              <Button label="Try again" variant="secondary" onPress={() => void reload()} style={styles.noticeAction} />
            </Card>
          ) : loading && !plan ? (
            <Loader />
          ) : !hasPlan ? (
            <Card variant="alt" style={styles.notice}>
              <Text variant="heading" align="center">
                Your week is not set yet
              </Text>
              <Text variant="subtitle" color="textSecondary" align="center" style={styles.noticeNote}>
                Your physio writes your training week. Once they have, it appears here day by day.
              </Text>
            </Card>
          ) : completedToday ? (
            <WorkoutCompleteCard />
          ) : isRestDay ? (
            <Card variant="alt" style={styles.rest}>
              <Text variant="heading" align="center">
                Today&apos;s Rest Day
              </Text>
              <Text variant="subtitle" color="textSecondary" align="center" style={styles.noticeNote}>
                Recovery is part of the plan.
              </Text>
            </Card>
          ) : (
            <SessionSummaryCard
              kicker="Today's Workout"
              sessionName={today ? `${DAY_LABEL[today.day_of_week]} Session` : 'Today'}
              exerciseCount={todayPlan.length}
              durationMin={todayPlan.length * MINUTES_PER_EXERCISE}
              onStart={() => router.push('/session')}
            />
          )}

          {missed && !error ? (
            <Card style={styles.missed}>
              <View style={styles.missedText}>
                <Text variant="bodyStrong">Trained on {DAY_LABEL[missed.day_of_week]}?</Text>
                <Text variant="caption" color="textSecondary">
                  It is not logged yet. You can still record it.
                </Text>
              </View>
              <Button
                label="Log it"
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
                ? `Pain logged at ${todayCheckIn.pain_score}/10. Tap to update.`
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
