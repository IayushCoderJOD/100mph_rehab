import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  PlanDraft,
  addExercises,
  applyRoutine,
  clearDay,
  copyDay,
  moveLine,
  removeLine,
  resolveLines,
  setPrescription,
} from '@/admin/planDraft';
import { DAY_LABEL, DAY_SHORT, DayOfWeek, Exercise, Routine, WEEK_DAYS } from '@/data';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { ExercisePicker } from './ExercisePicker';

type WeeklyPlanEditorProps = {
  draft: PlanDraft;
  onChange: (next: PlanDraft) => void;
  exercises: Exercise[];
  routines: Routine[];
};

type Sheet = null | 'add' | 'routine' | 'copy';

/**
 * The coach's week builder: pick a day, put exercises on it, say how much of
 * each. Purely controlled — the screen owns the draft and the save button, so
 * the same editor serves account creation and a later edit without knowing
 * which it is in.
 */
export function WeeklyPlanEditor({ draft, onChange, exercises, routines }: WeeklyPlanEditorProps) {
  const { theme } = useTheme();
  const [day, setDay] = useState<DayOfWeek>(WEEK_DAYS[0]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [copyTargets, setCopyTargets] = useState<DayOfWeek[]>([]);

  const lines = useMemo(() => resolveLines(draft[day], exercises), [draft, day, exercises]);
  const trainingDays = WEEK_DAYS.filter((d) => draft[d].length > 0).length;

  return (
    <View style={styles.wrap}>
      {/* ---- The week: one tab per day, a count where there is work ---- */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -theme.spacing(5) }}
        contentContainerStyle={[styles.days, { paddingHorizontal: theme.spacing(5) }]}
      >
        {WEEK_DAYS.map((d) => {
          const active = d === day;
          const count = draft[d].length;
          return (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${DAY_LABEL[d]}, ${count === 0 ? 'rest' : `${count} exercises`}`}
              style={({ pressed }) => [
                styles.dayTab,
                {
                  backgroundColor: active ? theme.colors.accentSoft : theme.colors.surface,
                  borderColor: active ? theme.colors.accentBorder : theme.colors.border,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text variant="caption" color={active ? 'accentText' : 'textSecondary'}>
                {DAY_SHORT[d]}
              </Text>
              <Text variant="bodyStrong" color={count === 0 ? 'textMuted' : 'textPrimary'}>
                {count === 0 ? '—' : count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text variant="caption" color="textSecondary" style={styles.weekNote}>
        {trainingDays === 0
          ? 'No training days yet. Pick a day and add exercises.'
          : `${trainingDays} training day${trainingDays === 1 ? '' : 's'} · ${7 - trainingDays} rest`}
      </Text>

      {/* ---- The selected day ---- */}
      <View style={styles.dayHead}>
        <Text variant="heading" style={styles.dayTitle}>
          {DAY_LABEL[day]}
        </Text>
        {lines.length > 0 ? (
          <Pressable onPress={() => onChange(clearDay(draft, day))} hitSlop={8} accessibilityRole="button">
            <Text variant="caption" color="textSecondary">
              Make it a rest day
            </Text>
          </Pressable>
        ) : null}
      </View>

      {lines.length === 0 ? (
        <Card variant="alt" style={styles.rest}>
          <Ionicons name="moon-outline" size={22} color={theme.colors.textMuted} />
          <Text variant="bodyStrong" align="center" style={styles.restTitle}>
            Rest day
          </Text>
          <Text variant="caption" color="textSecondary" align="center">
            Add exercises to make {DAY_LABEL[day]} a training day, or start from a routine.
          </Text>
        </Card>
      ) : (
        <View style={styles.lines}>
          {lines.map(({ line, exercise }, index) => (
            <View
              key={`${line.exercise_id}-${index}`}
              style={[
                styles.line,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: line.prescription.trim() ? theme.colors.border : theme.colors.accentBorder,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <View style={styles.lineTop}>
                <View
                  style={[
                    styles.position,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
                  ]}
                >
                  <Text variant="caption" color="textSecondary">
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.lineBody}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {exercise?.name ?? 'Unknown exercise'}
                  </Text>
                  <Text variant="caption" color="textSecondary" numberOfLines={1}>
                    {exercise?.focus ?? line.exercise_id}
                  </Text>
                </View>
                <View style={styles.lineActions}>
                  <Pressable
                    onPress={() => onChange(moveLine(draft, day, index, -1))}
                    disabled={index === 0}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Move up"
                    style={{ opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={18} color={theme.colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => onChange(moveLine(draft, day, index, 1))}
                    disabled={index === lines.length - 1}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Move down"
                    style={{ opacity: index === lines.length - 1 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => onChange(removeLine(draft, day, index))}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Remove"
                  >
                    <Ionicons name="close-circle-outline" size={20} color={theme.colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              <View
                style={[
                  styles.prescription,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.sm,
                  },
                ]}
              >
                <TextInput
                  value={line.prescription}
                  onChangeText={(text) => onChange(setPrescription(draft, day, index, text))}
                  placeholder="Prescription, e.g. 3 x 10 reps · Slow tempo"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.prescriptionInput, { color: theme.colors.textPrimary }]}
                  maxLength={200}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Button label="Add exercises" onPress={() => setSheet('add')} />
        <View style={styles.secondaryActions}>
          <Button
            label="From routine"
            variant="secondary"
            onPress={() => setSheet('routine')}
            style={styles.half}
          />
          <Button
            label="Copy to days"
            variant="secondary"
            disabled={lines.length === 0}
            onPress={() => {
              setCopyTargets([]);
              setSheet('copy');
            }}
            style={styles.half}
          />
        </View>
      </View>

      <ExercisePicker
        visible={sheet === 'add'}
        exercises={exercises}
        lockedIds={draft[day].map((line) => line.exercise_id)}
        title={`Add to ${DAY_LABEL[day]}`}
        onClose={() => setSheet(null)}
        onConfirm={(ids) => {
          onChange(addExercises(draft, day, ids, routines));
          setSheet(null);
        }}
      />

      {/* ---- Routine sheet: a starting point for the day ---- */}
      {sheet === 'routine' ? (
        <Card style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text variant="heading">Start {DAY_LABEL[day]} from</Text>
            <Pressable onPress={() => setSheet(null)} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <Text variant="caption" color="textSecondary" style={styles.sheetNote}>
            Replaces what is on the day. You can still add, remove and reorder afterwards.
          </Text>
          <View style={styles.routines}>
            {routines.map((routine) => (
              <Pressable
                key={routine.id}
                onPress={() => {
                  onChange(applyRoutine(draft, day, routine));
                  setSheet(null);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.routine,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={routine.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={theme.colors.accent}
                />
                <View style={styles.routineBody}>
                  <Text variant="bodyStrong">{routine.name}</Text>
                  <Text variant="caption" color="textSecondary" numberOfLines={2}>
                    {routine.description}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {routine.exercises.length} exercises · about {routine.approx_duration_min} min
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {/* ---- Copy sheet: the same day elsewhere in the week ---- */}
      {sheet === 'copy' ? (
        <Card style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text variant="heading">Copy {DAY_LABEL[day]} to</Text>
            <Pressable onPress={() => setSheet(null)} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.copyDays}>
            {WEEK_DAYS.filter((d) => d !== day).map((d) => {
              const on = copyTargets.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() =>
                    setCopyTargets((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[
                    styles.copyDay,
                    {
                      backgroundColor: on ? theme.colors.accentSoft : theme.colors.surfaceAlt,
                      borderColor: on ? theme.colors.accentBorder : theme.colors.border,
                      borderRadius: theme.radius.pill,
                    },
                  ]}
                >
                  <Text variant="caption" color={on ? 'accentText' : 'textSecondary'}>
                    {DAY_SHORT[d]}
                    {draft[d].length > 0 ? ' •' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text variant="caption" color="textMuted" style={styles.sheetNote}>
            A dot marks a day that already has work — copying replaces it.
          </Text>
          <Button
            label={copyTargets.length === 0 ? 'Choose days' : `Copy to ${copyTargets.length} day${copyTargets.length === 1 ? '' : 's'}`}
            disabled={copyTargets.length === 0}
            onPress={() => {
              onChange(copyDay(draft, day, copyTargets));
              setSheet(null);
            }}
            style={styles.sheetAction}
          />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  days: { gap: 8, paddingVertical: 2 },
  dayTab: { width: 54, alignItems: 'center', gap: 4, borderWidth: 1, paddingVertical: 10 },
  weekNote: { marginTop: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12, gap: 12 },
  dayTitle: { flex: 1 },
  rest: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  restTitle: { marginTop: 4 },
  lines: { gap: 10 },
  line: { borderWidth: 1, padding: 12, gap: 10 },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  position: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBody: { flex: 1, gap: 2 },
  lineActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prescription: { borderWidth: 1, paddingHorizontal: 12, height: 44, justifyContent: 'center' },
  prescriptionInput: { fontFamily: fontFamily.medium, fontSize: 14, height: '100%' },
  actions: { marginTop: 16, gap: 10 },
  secondaryActions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  sheet: { marginTop: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetNote: { marginTop: 6 },
  routines: { gap: 10, marginTop: 14 },
  routine: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: 1, padding: 14 },
  routineBody: { flex: 1, gap: 3 },
  copyDays: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  copyDay: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  sheetAction: { marginTop: 14 },
});
