import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

export type SessionStat = {
  value: string;
  label: string;
};

type SessionStatsProps = {
  stats: SessionStat[];
  style?: StyleProp<ViewStyle>;
};

/**
 * The at-a-glance numbers for a session — count, duration, whatever a program
 * needs next. Splits the row evenly however many it is handed.
 */
export function SessionStats({ stats, style }: SessionStatsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, style]}>
      {stats.map((stat, index) => (
        <View key={stat.label} style={styles.item}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          ) : null}
          <Text variant="title" align="center">
            {stat.value}
          </Text>
          <Text variant="caption" color="textSecondary" align="center" style={styles.label}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divider: { position: 'absolute', left: 0, top: 6, bottom: 6, width: 1 },
  label: { marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
});
