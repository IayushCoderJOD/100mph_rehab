import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Right-hand text, for rows that show a current setting. */
  value?: string;
  /** Destructive rows carry the danger colour through icon, title and border. */
  tone?: 'default' | 'danger';
  /** Swaps the chevron for an outbound-link glyph. */
  external?: boolean;
  onPress?: () => void;
};

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  tone = 'default',
  external = false,
  onPress,
}: SettingsRowProps) {
  const { theme } = useTheme();
  const danger = tone === 'danger';

  const iconColor = danger ? theme.colors.danger : theme.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: danger ? 'transparent' : theme.colors.surfaceAlt,
            borderColor: danger ? theme.colors.danger : theme.colors.border,
          },
        ]}
      >
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>

      <View style={styles.body}>
        <Text variant="bodyStrong" color={danger ? 'danger' : 'textPrimary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}

      {onPress ? (
        <Ionicons
          name={external ? 'open-outline' : 'chevron-forward'}
          size={16}
          color={theme.colors.textMuted}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  value: { maxWidth: 120, textAlign: 'right' },
});
