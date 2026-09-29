import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RequirePermission } from '@/access';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { Button, Card, Loader, Screen, SegmentedControl, Text } from '@/components/ui';
import { CATEGORY_LABEL, Exercise } from '@/data';
import { useExerciseLibrary } from '@/exercises';
import { useHover } from '@/hooks/useHover';
import { useDismiss } from '@/navigation/useDismiss';
import { useTheme } from '@/theme';

type Filter = 'all' | 'live' | 'needs_video' | 'hidden';

type Status = 'live' | 'needs_video' | 'hidden';

function statusOf(exercise: Exercise): Status {
  if (exercise.hidden) return 'hidden';
  return exercise.video_url ? 'live' : 'needs_video';
}

const STATUS_LABEL: Record<Status, string> = {
  live: 'Live',
  needs_video: 'Needs video',
  hidden: 'Hidden',
};

function ExerciseStatus({ status }: { status: Status }) {
  const { theme } = useTheme();
  const color = status === 'live' ? theme.colors.accentText : theme.colors.textSecondary;
  const borderColor = status === 'live' ? theme.colors.accentBorder : theme.colors.border;
  return (
    <View style={[styles.badge, { borderColor, borderRadius: theme.radius.pill }]}>
      <Text variant="label" color={color}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();
  const status = statusOf(exercise);

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, ${STATUS_LABEL[status]}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: hovered ? theme.colors.surfaceAlt : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.85 : status === 'hidden' ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons
        name={exercise.video_url ? 'play-circle-outline' : 'videocam-off-outline'}
        size={22}
        color={exercise.video_url ? theme.colors.accent : theme.colors.textMuted}
      />
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {CATEGORY_LABEL[exercise.category] ?? exercise.category}
          {exercise.focus ? ` · ${exercise.focus}` : ''}
        </Text>
      </View>
      <ExerciseStatus status={status} />
    </Pressable>
  );
}

/**
 * Every movement a coach can prescribe, and the way to add more.
 *
 * A movement with no video is a draft: it is here so it can be finished, but
 * the week editor will not offer it until members have something to watch.
 */
function ExerciseLibraryScreen() {
  const router = useRouter();
  const dismiss = useDismiss('/(tabs)/settings');
  const { all, loading, error, reload, usingBundledCatalogue } = useExerciseLibrary();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const tally = { live: 0, needs_video: 0, hidden: 0 };
    all.forEach((exercise) => {
      tally[statusOf(exercise)] += 1;
    });
    return tally;
  }, [all]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return all
      .filter((exercise) => filter === 'all' || statusOf(exercise) === filter)
      .filter(
        (exercise) =>
          !term ||
          exercise.name.toLowerCase().includes(term) ||
          (exercise.focus ?? '').toLowerCase().includes(term) ||
          (CATEGORY_LABEL[exercise.category] ?? '').toLowerCase().includes(term)
      );
  }, [all, filter, query]);

  return (
    <Screen scroll>
      <PageHeader
        title="Exercise Library"
        subtitle={`${counts.live} live · ${counts.needs_video} need a video · ${counts.hidden} hidden`}
        onBack={dismiss}
      />

      {usingBundledCatalogue ? (
        <Card variant="alt" style={styles.notice}>
          <Text variant="caption" color="textSecondary">
            This server does not have the exercise library yet, so these are the exercises built into the
            app. Adding and editing will work once the API is updated.
          </Text>
        </Card>
      ) : (
        <Button label="New Exercise" onPress={() => router.push('/admin/exercises/new')} style={styles.create} />
      )}

      <View style={styles.search}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, muscle group or category"
          autoCapitalize="none"
        />
      </View>

      <SegmentedControl<Filter>
        segments={[
          { label: 'All', value: 'all' },
          { label: 'Live', value: 'live' },
          { label: 'Needs video', value: 'needs_video' },
          { label: 'Hidden', value: 'hidden' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <View style={styles.list}>
        {error && all.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="heading" align="center">
              Could not load the library
            </Text>
            <Text variant="caption" color="textSecondary" align="center" style={styles.emptyNote}>
              {error}
            </Text>
            <Button label="Try again" variant="secondary" onPress={() => void reload()} style={styles.retry} />
          </Card>
        ) : loading && all.length === 0 ? (
          <Loader />
        ) : shown.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="heading" align="center">
              Nothing here
            </Text>
            <Text variant="caption" color="textSecondary" align="center" style={styles.emptyNote}>
              {filter === 'needs_video'
                ? 'Every exercise has a video.'
                : filter === 'hidden'
                  ? 'No exercises are hidden.'
                  : 'Try a different search, or add the exercise.'}
            </Text>
          </Card>
        ) : (
          shown.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              onPress={() => router.push(`/admin/exercises/${exercise.id}`)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

export default function ExerciseLibraryRoute() {
  return (
    <RequirePermission permission="clients.assign_exercise" fallback="/(tabs)/clients">
      <ExerciseLibraryScreen />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  notice: { marginTop: 20 },
  create: { marginTop: 20 },
  search: { marginTop: 18, marginBottom: 16 },
  list: { gap: 10, marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, padding: 14 },
  rowBody: { flex: 1, gap: 2 },
  badge: { borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyNote: { marginTop: 6 },
  retry: { marginTop: 16 },
});
