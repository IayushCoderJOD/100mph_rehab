import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type TileProps = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Tile({ icon, title, subtitle, onPress, style }: TileProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentBorder },
        ]}
      >
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={theme.colors.accent} />
      </View>
      <Text variant="heading" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" color="textSecondary">
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    padding: 18,
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {},
});
