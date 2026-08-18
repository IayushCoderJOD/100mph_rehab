import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

type CheckInRowProps = {
  completed: boolean;
  /** Shown after the completed title, e.g. today's score. */
  detail?: string;
  onPress?: () => void;
};

export function CheckInRow({ completed, detail, onPress }: CheckInRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <View
          style={[
            styles.badge,
            {
              borderColor: completed ? theme.colors.accent : theme.colors.border,
              backgroundColor: completed ? theme.colors.accentSoft : 'transparent',
            },
          ]}
        >
          <Ionicons
            name={completed ? 'checkmark-sharp' : 'add'}
            size={22}
            color={completed ? theme.colors.accent : theme.colors.textSecondary}
          />
        </View>
        <View style={styles.text}>
          <Text variant="heading">
            {completed ? 'Check In Completed' : 'Daily Check In'}
          </Text>
          <Text variant="caption" color="textSecondary">
            {completed
              ? (detail ?? 'Tracking is key for recovery.')
              : 'Log how you feel today.'}
          </Text>
        </View>
        {onPress ? (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 3 },
});
