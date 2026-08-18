import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { WeekDay } from '@/data';
import { useTheme } from '@/theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

/** The circle shrinks with the screen down to this floor, then the strip scrolls. */
const MIN_CIRCLE = 34;
const MAX_CIRCLE = 42;
const CELL_GAP = 4;

type WeekStripProps = {
  days: WeekDay[];
  title?: string;
  subtitle?: string;
  onEditSchedule?: () => void;
  onSelectDay?: (day: WeekDay) => void;
};

function DayCell({
  day,
  size,
  width,
  onPress,
}: {
  day: WeekDay;
  size: number;
  width: number;
  onPress?: () => void;
}) {
  const { theme } = useTheme();

  const isCompleted = day.status === 'completed';
  const isRest = day.status === 'rest';
  const isMissed = day.status === 'missed';
  const glows = isCompleted || day.is_today;

  const borderColor = isCompleted
    ? theme.colors.accent
    : day.is_today
      ? theme.colors.accent
      : isMissed
        ? theme.colors.danger
        : theme.colors.border;

  const numberColor = isRest ? 'textMuted' : isMissed ? 'textSecondary' : 'textPrimary';

  return (
    <Pressable
      style={[styles.cell, { width }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${day.short_label} ${day.date}, ${day.session_type?.name ?? 'Rest'}`}
    >
      <Text variant="caption" color={day.is_today ? 'accentText' : 'textSecondary'}>
        {day.short_label}
      </Text>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
            backgroundColor: isCompleted ? theme.colors.accentSoft : 'transparent',
            opacity: isRest ? 0.6 : isMissed ? 0.75 : 1,
          },
          glows &&
            !isRest && {
              shadowColor: theme.colors.accentGlow,
              shadowOpacity: 0.7,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            },
        ]}
      >
        {isCompleted ? (
          <Ionicons name="checkmark-sharp" size={Math.round(size * 0.43)} color={theme.colors.accent} />
        ) : (
          <Text variant="bodyStrong" color={numberColor}>
            {day.date}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/**
 * The current week at a glance. Purely presentational — it renders whatever
 * days it is handed, so it works for any program's plan.
 *
 * The row sizes itself to the card: circles shrink as the screen narrows and,
 * once they hit their floor, the week scrolls sideways rather than squashing
 * into something unreadable.
 */
export function WeekStrip({
  days,
  title = 'This Week',
  subtitle = 'Your Training Plan',
  onEditSchedule,
  onSelectDay,
}: WeekStripProps) {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const gutter = theme.spacing(5);

  // Estimate from the window until the card reports its real width, so the
  // first paint is already the right size: screen gutter + card padding.
  const [innerWidth, setInnerWidth] = useState(windowWidth - gutter * 4);
  const onLayout = (event: LayoutChangeEvent) => setInnerWidth(event.nativeEvent.layout.width);

  const perCell = days.length > 0 ? innerWidth / days.length : MAX_CIRCLE;
  const circle = Math.max(MIN_CIRCLE, Math.min(MAX_CIRCLE, Math.floor(perCell) - CELL_GAP));
  const cellWidth = circle + CELL_GAP;

  return (
    <Card>
      <View onLayout={onLayout}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption" color="textSecondary" style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Bleed to the card edges so a scrolled week is not clipped mid-padding.
        style={[styles.strip, { marginHorizontal: -gutter }]}
        contentContainerStyle={[styles.stripContent, { paddingHorizontal: gutter }]}
      >
        {days.map((day) => (
          <DayCell
            key={day.iso_date}
            day={day}
            size={circle}
            width={cellWidth}
            onPress={onSelectDay ? () => onSelectDay(day) : undefined}
          />
        ))}
      </ScrollView>

      <Button label="Edit Schedule" variant="ghost" onPress={onEditSchedule} style={styles.edit} />
    </Card>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 2 },
  strip: { marginTop: 20 },
  // flexGrow lets the week spread across a wide card; it scrolls once the
  // cells no longer fit.
  stripContent: { flexGrow: 1, justifyContent: 'space-between' },
  cell: { alignItems: 'center', gap: 8 },
  circle: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  edit: { marginTop: 20 },
});
