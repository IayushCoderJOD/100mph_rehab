import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type VideoPosterProps = {
  /** Null until real footage is attached — the poster says so rather than lying. */
  videoUrl: string | null;
  caption?: string;
  onPlay?: () => void;
};

/** The demonstration slot at the top of an exercise guide. */
export function VideoPoster({ videoUrl, caption, onPlay }: VideoPosterProps) {
  const { theme } = useTheme();
  const playable = !!videoUrl && !!onPlay;

  return (
    <View
      style={[
        styles.frame,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Pressable
        onPress={onPlay}
        disabled={!playable}
        accessibilityRole="button"
        accessibilityLabel={playable ? 'Play demonstration' : 'Demonstration coming soon'}
        style={({ pressed }) => [
          styles.play,
          {
            borderColor: playable ? theme.colors.accent : theme.colors.borderStrong,
            backgroundColor: playable ? theme.colors.accentSoft : 'transparent',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons
          name="play"
          size={26}
          color={playable ? theme.colors.accent : theme.colors.textMuted}
          style={styles.glyph}
        />
      </Pressable>

      <Text variant="caption" color="textMuted" align="center" style={styles.caption}>
        {caption ?? (playable ? 'Watch the demonstration' : 'Demonstration video coming soon')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 16 / 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The glyph's own bearing sits it left of centre inside the circle.
  glyph: { marginLeft: 3 },
  caption: { paddingHorizontal: 24 },
});
