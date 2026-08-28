import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/common';
import { MediaThumb } from '@/components/learn';
import { Screen, Text } from '@/components/ui';
import { findLearnContent } from '@/data';
import { useDismiss } from '@/navigation/useDismiss';
import { useProgramData } from '@/program/programData';
import { useTheme } from '@/theme';

export default function LessonScreen() {
  const dismiss = useDismiss('/(tabs)/learn');
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { learnContent } = useProgramData();

  const lesson = findLearnContent(learnContent, id ?? null);
  const isMini = lesson?.kind === 'mini_lesson';

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <IconButton name="close" variant="plain" onPress={dismiss} />
      </View>

      {!lesson ? (
        <View style={styles.empty}>
          <Text variant="title" align="center">
            Lesson not found
          </Text>
        </View>
      ) : (
        <>
          <MediaThumb
            thumbnailUrl={lesson.thumbnail_url}
            videoUrl={lesson.video_url}
            durationSec={lesson.duration_sec}
            aspectRatio={16 / 9}
            playSize={64}
          />

          <Text variant="label" color="accentText" style={styles.kicker}>
            {isMini ? 'MINI LESSON' : 'LONGFORM'}
          </Text>
          <Text variant="display" style={styles.title}>
            {lesson.title}
          </Text>
          <Text variant="subtitle" color="textSecondary" style={styles.subtitle}>
            {lesson.subtitle}
          </Text>

          <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

          <Text variant="body" color="textSecondary" style={styles.prose}>
            {lesson.description}
          </Text>

          {!lesson.video_url ? (
            <View
              style={[
                styles.notice,
                { borderColor: theme.colors.border, borderRadius: theme.radius.md },
              ]}
            >
              <Text variant="caption" color="textMuted">
                The video for this lesson is being filmed. The write-up above is the whole idea in
                the meantime.
              </Text>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  headerSpacer: { flex: 1 },
  kicker: { letterSpacing: 1.4, marginTop: 26 },
  title: { marginTop: 8 },
  subtitle: { marginTop: 6 },
  rule: { height: 1, marginVertical: 24 },
  prose: { lineHeight: 24 },
  notice: { borderWidth: 1, padding: 16, marginTop: 28 },
  empty: { paddingTop: 80 },
});
