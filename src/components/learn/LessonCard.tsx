import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LearnContent } from '@/data';
import { useHover } from '@/hooks/useHover';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';
import { MediaThumb } from './MediaThumb';

/** Rail card widths. Sized so a sliver of the next card shows and the rail reads as scrollable. */
export const MINI_CARD_WIDTH = 156;
export const LONGFORM_CARD_WIDTH = 268;

type LessonCardProps = {
  content: LearnContent;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * One lesson in a rail. The two kinds are the same card at two sizes: a mini
 * lesson is a glance, a longform is a sit-down, and the shape says which
 * before the title is read.
 */
export function LessonCard({ content, onPress, style }: LessonCardProps) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();
  const isMini = content.kind === 'mini_lesson';

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${content.title}. ${content.subtitle}`}
      style={({ pressed }) => [
        styles.card,
        {
          width: isMini ? MINI_CARD_WIDTH : LONGFORM_CARD_WIDTH,
          backgroundColor: hovered ? theme.colors.surfaceRaised : theme.colors.surface,
          borderColor: hovered ? theme.colors.borderStrong : theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <MediaThumb
        thumbnailUrl={content.thumbnail_url}
        videoUrl={content.video_url}
        durationSec={content.duration_sec}
        aspectRatio={isMini ? 1 : 16 / 9}
        playSize={isMini ? 38 : 46}
      />

      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {content.title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {content.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 10, gap: 10, flexGrow: 0, flexShrink: 0 },
  body: { gap: 3, paddingHorizontal: 2, paddingBottom: 4 },
});
