import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_LABEL, EXERCISE_CATEGORIES, Exercise, ExerciseCategory } from '@/data';
import { useHover } from '@/hooks/useHover';
import { useTheme } from '@/theme';
import { TextField } from '../form/TextField';
import { ExerciseGuide } from '../session/ExerciseGuide';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

type ExercisePickerProps = {
  visible: boolean;
  exercises: Exercise[];
  /** Already on the list — shown ticked and locked so they cannot be added twice. */
  lockedIds?: string[];
  title?: string;
  confirmLabel?: (count: number) => string;
  onConfirm: (exerciseIds: string[]) => void;
  onClose: () => void;
};

/** The chip row's "show everything" option, alongside the real categories. */
type Shelf = ExerciseCategory | 'all';

type Section = { category: ExerciseCategory; title: string; data: Exercise[] };

/**
 * The catalogue as a searchable, multi-select list. Used wherever a coach
 * picks movements — a day of the week, a batch of prescriptions — so the
 * search and the tick behave the same everywhere.
 *
 * With forty-odd movements a flat list stopped being scannable, so the list
 * is shelved by category with a chip row to jump to one. Search is a second,
 * independent filter: it narrows whatever shelf is showing, and on "All" it
 * looks across every category at once.
 *
 * Every row can be opened as a preview — the demonstration and the guide the
 * member will see — so a coach can check a movement before prescribing it
 * without leaving the sheet. The list stays mounted underneath, so coming
 * back keeps the search, the shelf and the scroll position.
 */
export function ExercisePicker({
  visible,
  exercises,
  lockedIds = [],
  title = 'Add exercises',
  confirmLabel = (count) => (count === 0 ? 'Select exercises' : `Add ${count} exercise${count === 1 ? '' : 's'}`),
  onConfirm,
  onClose,
}: ExercisePickerProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [shelf, setShelf] = useState<Shelf>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // A fresh sheet every time it opens: nothing ticked, nothing typed.
  useEffect(() => {
    if (visible) {
      setQuery('');
      setShelf('all');
      setSelected([]);
      setPreviewId(null);
    }
  }, [visible]);

  const locked = useMemo(() => new Set(lockedIds), [lockedIds]);

  const preview = previewId ? exercises.find((e) => e.id === previewId) ?? null : null;

  // Only offer chips for categories that actually have something on them.
  const shelves = useMemo<Shelf[]>(() => {
    const present = new Set(exercises.map((e) => e.category));
    return ['all', ...EXERCISE_CATEGORIES.filter((c) => present.has(c))];
  }, [exercises]);

  const term = query.trim().toLowerCase();

  const sections = useMemo<Section[]>(() => {
    const matches = (e: Exercise) =>
      !term ||
      e.name.toLowerCase().includes(term) ||
      e.focus.toLowerCase().includes(term) ||
      CATEGORY_LABEL[e.category].toLowerCase().includes(term);

    const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name);
    const categories = shelf === 'all' ? EXERCISE_CATEGORIES : [shelf];

    return categories
      .map((category) => ({
        category,
        title: CATEGORY_LABEL[category],
        data: exercises.filter((e) => e.category === category && matches(e)).sort(byName),
      }))
      .filter((s) => s.data.length > 0);
  }, [exercises, shelf, term]);

  const shown = sections.reduce((n, s) => n + s.data.length, 0);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.sheet, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {preview ? (
            <Pressable
              onPress={() => setPreviewId(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back to the list"
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </Pressable>
          ) : null}
          <View style={styles.headerText}>
            <Text variant="heading">{preview ? 'Preview' : title}</Text>
            <Text variant="caption" color="textSecondary">
              {preview
                ? CATEGORY_LABEL[preview.category]
                : selected.length > 0
                  ? `${selected.length} selected`
                  : shown === exercises.length
                    ? `${exercises.length} in the catalogue`
                    : `${shown} of ${exercises.length}`}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {preview ? (
          <ScrollView contentContainerStyle={styles.previewBody}>
            {/* Keyed so the player is torn down between exercises rather than
                carrying one demonstration over into the next. */}
            <ExerciseGuide key={preview.id} exercise={preview} />
          </ScrollView>
        ) : null}

        <View style={[styles.browse, preview ? styles.hidden : null]}>
          <View style={styles.search}>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, muscle group or category"
              autoCapitalize="none"
              autoFocus
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // A ScrollView shrinks by default; next to a flex: 1 list that
            // means it collapses to nothing, so it has to refuse to.
            style={styles.chipRow}
            contentContainerStyle={styles.chips}
          >
            {shelves.map((s) => (
              <Chip
                key={s}
                label={s === 'all' ? 'All' : CATEGORY_LABEL[s]}
                active={s === shelf}
                onPress={() => setShelf(s)}
              />
            ))}
          </ScrollView>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text variant="caption" color="textMuted" align="center">
                  {shelf === 'all'
                    ? `Nothing matches “${query.trim()}”.`
                    : `Nothing in ${CATEGORY_LABEL[shelf]} matches “${query.trim()}”.`}
                </Text>
                {shelf !== 'all' ? (
                  <Pressable onPress={() => setShelf('all')} hitSlop={8} accessibilityRole="button">
                    <Text variant="label" color="accent" align="center">
                      Search all categories
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            }
            // One shelf showing means the chip is already the heading.
            renderSectionHeader={
              shelf === 'all'
                ? ({ section }) => (
                    <View style={styles.sectionHeader}>
                      <Text variant="label" color="textSecondary">
                        {section.title}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {section.data.length}
                      </Text>
                    </View>
                  )
                : undefined
            }
            renderItem={({ item }) => {
              const isLocked = locked.has(item.id);
              const isOn = isLocked || selected.includes(item.id);
              // The tick and the preview are siblings rather than one inside
              // the other: a button nested in a checkbox is two controls
              // fighting over one tap, and a screen reader cannot reach it.
              return (
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: isOn && !isLocked ? theme.colors.accentSoft : theme.colors.surface,
                      borderColor: isOn && !isLocked ? theme.colors.accentBorder : theme.colors.border,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Pressable
                    onPress={isLocked ? undefined : () => toggle(item.id)}
                    disabled={isLocked}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isOn, disabled: isLocked }}
                    style={({ pressed }) => [styles.rowToggle, { opacity: isLocked ? 0.5 : pressed ? 0.85 : 1 }]}
                  >
                    <View
                      style={[
                        styles.check,
                        {
                          borderColor: isOn ? theme.colors.accent : theme.colors.borderStrong,
                          backgroundColor: isOn ? theme.colors.accent : 'transparent',
                        },
                      ]}
                    >
                      {isOn ? <Ionicons name="checkmark-sharp" size={13} color={theme.colors.onAccent} /> : null}
                    </View>
                    <View style={styles.rowBody}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="caption" color="textSecondary" numberOfLines={1}>
                        {isLocked ? 'Already on the list' : item.focus}
                      </Text>
                    </View>
                  </Pressable>
                  <PreviewButton
                    name={item.name}
                    hasVideo={!!item.video_url}
                    onPress={() => setPreviewId(item.id)}
                  />
                </View>
              );
            }}
          />
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          {preview ? (
            <Button
              label={
                locked.has(preview.id)
                  ? 'Already on the list'
                  : selected.includes(preview.id)
                    ? 'Remove from selection'
                    : 'Select this exercise'
              }
              variant={selected.includes(preview.id) ? 'secondary' : 'primary'}
              disabled={locked.has(preview.id)}
              onPress={() => {
                // Back to the list either way: that is where the choice is
                // confirmed, alongside anything else already ticked.
                toggle(preview.id);
                setPreviewId(null);
              }}
            />
          ) : (
            <Button
              label={confirmLabel(selected.length)}
              disabled={selected.length === 0}
              onPress={() => onConfirm(selected)}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Opens the row's exercise as a preview. The glyph says whether there is
 * footage to watch or only the written guide — what the camera icon on the
 * row used to tell a coach on its own.
 */
function PreviewButton({ name, hasVideo, onPress }: { name: string; hasVideo: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Preview ${name}`}
      style={({ pressed }) => [
        styles.previewButton,
        {
          borderRadius: theme.radius.pill,
          borderColor: hovered ? theme.colors.accentBorder : theme.colors.border,
          backgroundColor: hovered ? theme.colors.surfaceAlt : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons
        name={hasVideo ? 'play-circle-outline' : 'document-text-outline'}
        size={16}
        color={hasVideo ? theme.colors.accent : theme.colors.textSecondary}
      />
      <Text variant="label" color="textSecondary">
        Preview
      </Text>
    </Pressable>
  );
}

/**
 * Its own component only so it can hold hover state — a hook cannot live
 * inside the `.map` above, and every chip needs its own.
 */
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        {
          borderRadius: theme.radius.pill,
          backgroundColor: active ? theme.colors.accentSoft : hovered ? theme.colors.surfaceAlt : theme.colors.surface,
          borderColor: active ? theme.colors.accentBorder : theme.colors.border,
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
  sheet: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  headerText: { flex: 1, gap: 2 },
  browse: { flex: 1 },
  // Hidden rather than unmounted, so the list comes back exactly as it was.
  hidden: { display: 'none' },
  previewBody: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 32 },
  search: { paddingHorizontal: 20, paddingTop: 16 },
  chipRow: { flexGrow: 0, flexShrink: 0 },
  chips: { paddingHorizontal: 20, paddingTop: 12, gap: 8, flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  list: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20, gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 2,
    paddingHorizontal: 2,
  },
  empty: { paddingTop: 32, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, paddingRight: 12 },
  rowToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  footer: { borderTopWidth: 1, padding: 20 },
});
