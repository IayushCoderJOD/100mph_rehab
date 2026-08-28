import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { ClientStats } from '@/admin';
import { User } from '@/data';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';
import { StatusBadge } from './StatusBadge';

type ClientRowProps = {
  client: User;
  stats: ClientStats;
  programName: string;
  onPress?: () => void;
};

/**
 * One client on the roster. Leads with the two numbers a coach actually scans
 * for — how much pain, and how long since they showed up — because a list that
 * only shows names makes you open every row to find the one that matters.
 */
export function ClientRow({ client, stats, programName, onPress }: ClientRowProps) {
  const { theme } = useTheme();

  const silence =
    stats.daysSinceCheckIn === null
      ? 'No check-ins yet'
      : stats.daysSinceCheckIn === 0
        ? 'Checked in today'
        : `${stats.daysSinceCheckIn}d since check-in`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${client.full_name}, ${programName}, ${silence}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: stats.needsAttention ? theme.colors.accentBorder : theme.colors.border,
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.score,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radius.sm,
          },
        ]}
      >
        <Text variant="bodyStrong">{stats.latestPain ?? '—'}</Text>
        <Text variant="label" color="textMuted">
          PAIN
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {client.full_name}
          </Text>
          <StatusBadge status={client.status} />
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {programName} · {stats.sessionsLast7} session{stats.sessionsLast7 === 1 ? '' : 's'} this
          week
        </Text>
        <Text
          variant="caption"
          color={stats.needsAttention ? 'accentText' : 'textMuted'}
          numberOfLines={1}
        >
          {silence}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    padding: 14,
  },
  score: {
    width: 46,
    height: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  body: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1 },
});
