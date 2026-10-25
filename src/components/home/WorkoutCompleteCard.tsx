import { StyleSheet } from 'react-native';
import { useI18n } from '@/i18n';
import { Card } from '../ui/Card';
import { HeartBadge } from '../ui/HeartBadge';
import { Text } from '../ui/Text';

type WorkoutCompleteCardProps = {
  title?: string;
  message?: string;
};

export function WorkoutCompleteCard({ title, message }: WorkoutCompleteCardProps) {
  const { t } = useI18n();
  return (
    <Card variant="alt" style={styles.card}>
      <HeartBadge size={132} glow />
      <Text variant="display" align="center" style={styles.title}>
        {title ?? t.workoutComplete.title}
      </Text>
      <Text variant="subtitle" color="textSecondary" align="center">
        {message ?? t.workoutComplete.message}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: 40 },
  title: { marginTop: 28, marginBottom: 4 },
});
