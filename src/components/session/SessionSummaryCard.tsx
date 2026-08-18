import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { SessionStats } from './SessionStats';

type SessionSummaryCardProps = {
  /** Small line above the name, e.g. "Today's Workout". */
  kicker?: string;
  sessionName: string;
  exerciseCount: number;
  durationMin: number;
  actionLabel?: string;
  onStart?: () => void;
};

/**
 * What today asks of you, in one box: the flow, how much of it there is, and
 * the way in. Knows nothing about which program it belongs to.
 */
export function SessionSummaryCard({
  kicker = "Today's Workout",
  sessionName,
  exerciseCount,
  durationMin,
  actionLabel = 'Start Session',
  onStart,
}: SessionSummaryCardProps) {
  const { theme } = useTheme();

  return (
    <Card variant="alt" style={styles.card}>
      <Text variant="label" color="textSecondary" align="center" style={styles.kicker}>
        {kicker}
      </Text>
      <Text variant="title" align="center" style={styles.name}>
        {sessionName}
      </Text>

      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

      <SessionStats
        stats={[
          { value: `${exerciseCount}`, label: 'Exercises' },
          { value: `${durationMin}m`, label: 'Duration' },
        ]}
      />

      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

      <Button label={actionLabel} onPress={onStart} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 28 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.4 },
  name: { marginTop: 6 },
  rule: { height: 1, marginVertical: 22 },
});
