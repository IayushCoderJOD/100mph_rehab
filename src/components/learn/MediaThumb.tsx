import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/api';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

/** 20 → '0:20', 760 → '12:40'. */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${`${secs}`.padStart(2, '0')}`;
}

type MediaThumbProps = {
  thumbnailUrl: string | null;
  videoUrl: string | null;
  durationSec: number | null;
  /** 16/9 for longform, closer to square for the short lessons. */
  aspectRatio?: number;
  playSize?: number;
};

/**
 * The picture on a lesson card. Every field it renders can be null, because
 * the library is written before it is filmed — so the placeholder is the
 * designed state, not a fallback, and the card never shows a broken frame.
 */
export function MediaThumb({
  thumbnailUrl,
  videoUrl,
  durationSec,
  aspectRatio = 16 / 9,
  playSize = 40,
}: MediaThumbProps) {
  const { theme } = useTheme();
  const ready = !!mediaUrl(videoUrl);
  const poster = mediaUrl(thumbnailUrl);

  return (
    <View
      style={[
        styles.frame,
        {
          aspectRatio,
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      {/* Once a lesson is filmed the still speaks for it. Until then a tint
          rather than an image, so a rail of unfilmed lessons still has shape
          and depth instead of reading as a row of empty boxes. */}
      {poster ? (
        <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[theme.colors.accentSoft, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View
        style={[
          styles.play,
          {
            width: playSize,
            height: playSize,
            borderRadius: playSize / 2,
            borderColor: ready ? theme.colors.accent : theme.colors.borderStrong,
            backgroundColor: ready ? theme.colors.accentSoft : 'transparent',
          },
        ]}
      >
        <Ionicons
          name={ready ? 'play' : 'time-outline'}
          size={Math.round(playSize * 0.42)}
          color={ready ? theme.colors.accent : theme.colors.textMuted}
          // The play glyph's bearing sits it left of centre inside the circle.
          style={ready ? styles.glyph : undefined}
        />
      </View>

      {durationSec !== null ? (
        <View
          style={[
            styles.pill,
            { backgroundColor: theme.colors.overlay, borderRadius: theme.radius.sm },
          ]}
        >
          <Text variant="label" color="textPrimary">
            {formatDuration(durationSec)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  play: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  glyph: { marginLeft: 2 },
  pill: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
});
