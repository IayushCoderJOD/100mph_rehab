import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type DetailRowProps = {
  label: string;
  value: string;
  last?: boolean;
};

/** Label on the left, the fact on the right — for read-only account details. */
export function DetailRow({ label, value, last = false }: DetailRowProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
      ]}
    >
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.value} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 15,
  },
  value: { flexShrink: 1, textAlign: 'right' },
});
