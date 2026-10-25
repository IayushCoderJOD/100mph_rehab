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
import { useI18n } from '@/i18n';
import { useDismiss } from '@/navigation/useDismiss';
import { useTheme } from '@/theme';

type Filter = 'all' | 'live' | 'needs_video' | 'hidden';

type Status = 'live' | 'needs_video' | 'hidden';

function statusOf(exercise: Exercise): Status {
  if (exercise.hidden) return 'hidden';
  return exercise.video_url ? 'live' : 'needs_video';
}

function ExerciseStatus({ status }: { status: Status }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const color = status === 'live' ? theme.colors.accentText : theme.colors.textSecondary;
  const borderColor = status === 'live' ? theme.colors.accentBorder : theme.colors.border;
  return (
    <View style={[styles.badge, { borderColor, borderRadius: theme.radius.pill }]}>
      <Text variant="label" color={color}>
        {t.library.status[status]}
      </Text>
    </View>
  );
}

function ExerciseRow({ exercise: stored, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { theme } = useTheme();
  const { t, localize } = useI18n();
  const { hovered, hoverProps } = useHover();
  const status = statusOf(stored);
  const exercise = localize.exercise(stored);

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.library.rowA11y(exercise.name, t.library.status[status])}
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
          {t.categories[exercise.category] ?? exercise.category}
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
  const { t, localize } = useI18n();

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
      .filter((exercise) => {
        if (!term) return true;
        // Either language finds it: the rows read in the chosen one, the names a coach knows may be English.
        const shown = localize.exercise(exercise);
        return [
          exercise.name,
          exercise.focus,
          shown.name,
          shown.focus,
          CATEGORY_LABEL[exercise.category],
          t.categories[exercise.category],
        ].some((text) => (text ?? '').toLowerCase().includes(term));
      });
  }, [all, filter, query, t, localize]);

  return (
    <Screen scroll>
      <PageHeader
        title={t.library.title}
        subtitle={t.library.subtitle(counts.live, counts.needs_video, counts.hidden)}
        onBack={dismiss}
      />

      {usingBundledCatalogue ? (
        <Card variant="alt" style={styles.notice}>
          <Text variant="caption" color="textSecondary">
            {t.library.bundled}
          </Text>
        </Card>
      ) : (
        <Button label={t.library.newExercise} onPress={() => router.push('/admin/exercises/new')} style={styles.create} />
      )}

      <View style={styles.search}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={t.library.search}
          autoCapitalize="none"
        />
      </View>

      <SegmentedControl<Filter>
        segments={[
          { label: t.library.all, value: 'all' },
          { label: t.library.status.live, value: 'live' },
          { label: t.library.status.needs_video, value: 'needs_video' },
          { label: t.library.status.hidden, value: 'hidden' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <View style={styles.list}>
        {error && all.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="heading" align="center">
              {t.library.loadFailed}
            </Text>
            <Text variant="caption" color="textSecondary" align="center" style={styles.emptyNote}>
              {error}
            </Text>
            <Button label={t.common.tryAgain} variant="secondary" onPress={() => void reload()} style={styles.retry} />
          </Card>
        ) : loading && all.length === 0 ? (
          <Loader />
        ) : shown.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="heading" align="center">
              {t.library.nothing}
            </Text>
            <Text variant="caption" color="textSecondary" align="center" style={styles.emptyNote}>
              {filter === 'needs_video'
                ? t.library.allHaveVideo
                : filter === 'hidden'
                  ? t.library.noneHidden
                  : t.library.tryDifferent}
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
