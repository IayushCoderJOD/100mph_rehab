import { StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { HeartBadge } from '../ui/HeartBadge';
import { Text } from '../ui/Text';

type WorkoutCompleteCardProps = {
  title?: string;
  message?: string;
};

export function WorkoutCompleteCard({
  title = 'Workout Complete',
  message = 'Rooting for you!',
}: WorkoutCompleteCardProps) {
  return (
    <Card variant="alt" style={styles.card}>
      <HeartBadge size={132} glow />
      <Text variant="display" align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="subtitle" color="textSecondary" align="center">
        {message}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: 40 },
  title: { marginTop: 28, marginBottom: 4 },
});
