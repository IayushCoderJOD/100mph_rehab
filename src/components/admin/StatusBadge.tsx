import { StyleSheet, View } from 'react-native';
import { UserStatus } from '@/data';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

/** Account state as a pill. Colour is backed by the word, never carrying it alone. */
export function StatusBadge({ status }: { status: UserStatus }) {
  const { theme } = useTheme();
  const { t } = useI18n();

  const color =
    status === 'active'
      ? theme.colors.accentText
      : status === 'suspended'
        ? theme.colors.danger
        : theme.colors.textSecondary;

  const borderColor =
    status === 'active'
      ? theme.colors.accentBorder
      : status === 'suspended'
        ? theme.colors.danger
        : theme.colors.border;

  return (
    <View style={[styles.badge, { borderColor, borderRadius: theme.radius.pill }]}>
      <Text variant="label" color={color}>
        {t.userStatus[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
});
