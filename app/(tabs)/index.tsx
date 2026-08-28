import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { useCheckIns } from '@/checkin/CheckInProvider';
import { AppHeader, ThemeToggle } from '@/components/common';
import { CheckInRow, PracticeOverview, WeekStrip, WorkoutCompleteCard } from '@/components/home';
import { SessionSummaryCard } from '@/components/session';
import { Card, Logo, Screen, Text } from '@/components/ui';
import { buildSessionPlan, firstName } from '@/data';
import { useProgramData } from '@/program/programData';
import { useSchedule } from '@/schedule/ScheduleProvider';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { program, exercises, sessionExercises } = useProgramData();
  const { week, today } = useSchedule();
  const { hasCheckedInToday, todayCheckIn } = useCheckIns();
  const { user } = useAuth();
  const { can, isAdmin } = useAccess();

  const greeting = firstName(user?.full_name) ?? 'there';

  const sessionType = today?.session_type ?? null;
  const plan = useMemo(
    () => buildSessionPlan(sessionType?.id ?? null, exercises, sessionExercises),
    [sessionType, exercises, sessionExercises],
  );

  const isRestDay = !sessionType;
  const completedToday = today?.status === 'completed';

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
          />
        </View>
      ) : (
        <View style={styles.stack}>
          <WeekStrip
            days={week}
            subtitle={`${program.name} · Your Training Plan`}
            onEditSchedule={() => router.push('/edit-schedule')}
            onSelectDay={(day) => router.push(`/session?date=${day.iso_date}`)}
          />

          {completedToday ? (
            <WorkoutCompleteCard />
          ) : isRestDay ? (
            <Card variant="alt" style={styles.rest}>
              <Text variant="heading" align="center">
                Today&apos;s Rest Day
              </Text>
              <Text variant="subtitle" color="textSecondary" align="center" style={styles.restNote}>
                Recovery is part of the plan.
              </Text>
            </Card>
          ) : (
            <SessionSummaryCard
              sessionName={sessionType.name}
              exerciseCount={plan.length}
              durationMin={sessionType.approx_duration_min}
              onStart={() => router.push('/session')}
            />
          )}

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
  restNote: { marginTop: 6 },
});
