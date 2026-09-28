import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/api';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type VideoPosterProps = {
  /** A catalogue media key, or null until real footage is attached. */
  videoUrl: string | null;
  /** The still shown before playback starts. Optional; the frame works without it. */
  posterUrl?: string | null;
  caption?: string;
};

/**
 * The demonstration slot at the top of an exercise guide.
 *
 * Nothing is fetched until the member taps. A guide screen is often opened to
 * read the instructions rather than to watch, and the whole point of hosting
 * the library on a zero-egress CDN is lost if every visit pulls a video nobody
 * asked for. Once tapped, `useCaching` keeps the file on the device — the
 * second viewing of an exercise, and every viewing after it, costs nothing and
 * works with no signal at all, which is the normal condition of a gym.
 */
export function VideoPoster({ videoUrl, posterUrl, caption }: VideoPosterProps) {
  const { theme } = useTheme();
  const [started, setStarted] = useState(false);

  const uri = mediaUrl(videoUrl);
  const poster = mediaUrl(posterUrl);
  const playable = !!uri;

  // Null until tapped, so constructing the player costs no network. The hook
  // itself stays unconditional — `VideoSource` accepts null for exactly this.
  const player = useVideoPlayer(started && uri ? { uri, useCaching: true } : null, (instance) => {
    // Demos are short and read better on repeat than they do paused on the
    // last frame, so the loop is the resting state rather than a preference.
    instance.loop = true;
    // Demos are silent by design. The hand-encoded ones have no audio track,
    // but a video an admin uploads from the app may, so mute it here.
    instance.muted = true;
  });

  useEffect(() => {
    if (started) player.play();
  }, [started, player]);

  if (started && playable) {
    return (
      <VideoView
        player={player}
        style={[
          styles.frame,
          { borderColor: theme.colors.border, borderRadius: theme.radius.lg },
        ]}
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        nativeControls
      />
    );
  }

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
      {/* The poster is a bonus, not a requirement: the placeholder below was
          designed to stand on its own and still does when no still exists. */}
      {poster ? (
        <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}

      <Pressable
        onPress={() => setStarted(true)}
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

      {/* Over a poster the caption needs its own backing to stay readable. */}
      <View
        style={
          poster
            ? [styles.captionPill, { borderRadius: theme.radius.pill }]
            : undefined
        }
      >
        <Text
          variant="caption"
          color={poster ? '#FFFFFF' : 'textMuted'}
          align="center"
          style={styles.caption}
        >
          {caption ?? (playable ? 'Watch the demonstration' : 'Demonstration video coming soon')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 16 / 10,
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    overflow: 'hidden',
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
  captionPill: { backgroundColor: 'rgba(0, 0, 0, 0.55)', paddingVertical: 5, paddingHorizontal: 2 },
});
