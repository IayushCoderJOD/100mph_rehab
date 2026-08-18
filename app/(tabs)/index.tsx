import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useCheckIns } from '@/checkin/CheckInProvider';
import { AppHeader, ThemeToggle } from '@/components/common';
import { CheckInRow, WeekStrip, WorkoutCompleteCard } from '@/components/home';
import { SessionSummaryCard } from '@/components/session';
import { Card, Logo, Screen, Text } from '@/components/ui';
import { buildSessionPlan, mock } from '@/data';
import { useProgramData } from '@/program/programData';
import { useSchedule } from '@/schedule/ScheduleProvider';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { program, exercises, sessionExercises } = useProgramData();
  const { week, today } = useSchedule();
  const { hasCheckedInToday, todayCheckIn } = useCheckIns();

  const firstName = mock.user.full_name.split(' ')[0];

  const sessionType = today?.session_type ?? null;
  const plan = useMemo(
    () => buildSessionPlan(sessionType?.id ?? null, exercises, sessionExercises),
    [sessionType, exercises, sessionExercises]
  );

  const isRestDay = !sessionType;
  const completedToday = today?.status === 'completed';

  return (
    <Screen scroll>
      <AppHeader
        subtitle="Welcome back"
        title={firstName}
        center={<Logo height={width < 380 ? 26 : 34} />}
        right={<ThemeToggle />}
      />

      <View style={styles.stack}>
        <WeekStrip
          days={week}
          subtitle={`${program.name} · Your Training Plan`}
          onEditSchedule={() => router.push('/edit-schedule')}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16, marginTop: 12 },
  rest: { alignItems: 'center', paddingVertical: 32 },
  restNote: { marginTop: 6 },
});
