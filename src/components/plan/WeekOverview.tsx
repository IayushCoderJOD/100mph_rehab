import { Pressable, StyleSheet, View } from 'react-native';
import { DAY_LABEL, DAY_SHORT, WEEK_DAYS, WeeklyPlan } from '@/data';
import { useTheme } from '@/theme';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

type WeekOverviewProps = {
  plan: WeeklyPlan | null;
  onPress?: () => void;
};

/**
 * A client's week at a glance for the coach: which days train, and on what.
 * Read-only; tapping it opens the editor.
 */
export function WeekOverview({ plan, onPress }: WeekOverviewProps) {
  const { theme } = useTheme();
  const hasWork = !!plan && WEEK_DAYS.some((day) => (plan.days[day]?.length ?? 0) > 0);

  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <Card style={styles.card}>
        {!hasWork ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.empty}>
            No week written yet. Until it is, every day shows as rest.
          </Text>
        ) : (
          WEEK_DAYS.map((day, index) => {
            const lines = [...(plan?.days[day] ?? [])].sort((a, b) => a.sort_order - b.sort_order);
            const names = lines.map((line) => line.exercise?.name ?? line.exercise_id);
            return (
              <View
                key={day}
                style={[
                  styles.row,
                  index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border },
                ]}
              >
                <View style={styles.day}>
                  <Text variant="bodyStrong" color={lines.length === 0 ? 'textMuted' : 'textPrimary'}>
                    {DAY_SHORT[day]}
                  </Text>
                </View>
                <Text
                  variant="caption"
                  color={lines.length === 0 ? 'textMuted' : 'textSecondary'}
                  numberOfLines={2}
                  style={styles.names}
                  accessibilityLabel={`${DAY_LABEL[day]}: ${names.join(', ') || 'rest'}`}
                >
                  {lines.length === 0 ? 'Rest' : names.join(' · ')}
                </Text>
                {lines.length > 0 ? (
                  <Text variant="caption" color="textMuted">
                    {lines.length}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
        {plan?.updated_by_name ? (
          <Text variant="caption" color="textMuted" style={styles.footer}>
            Last written by {plan.updated_by_name}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 4 },
  empty: { paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  day: { width: 40 },
  names: { flex: 1 },
  footer: { paddingTop: 10, paddingBottom: 8 },
});
