import { Pressable, StyleSheet, View } from 'react-native';
import { useHover } from '@/hooks/useHover';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Segment<T extends string> = { label: string; value: T };

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill },
      ]}
    >
      {segments.map((seg) => (
        <Segment
          key={seg.value}
          label={seg.label}
          active={seg.value === value}
          onPress={() => onChange(seg.value)}
        />
      ))}
    </View>
  );
}

/**
 * Its own component only so it can hold hover state — a hook cannot live
 * inside the `.map` above, and every segment needs its own.
 */
function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.segment,
        {
          borderRadius: theme.radius.pill,
          // The inactive half of a segmented control looks like a label rather
          // than a control until the pointer proves otherwise.
          backgroundColor: active
            ? theme.colors.surfaceRaised
            : hovered
              ? theme.colors.surface
              : 'transparent',
        },
      ]}
    >
      <Text variant="label" color={active ? 'textPrimary' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
});
