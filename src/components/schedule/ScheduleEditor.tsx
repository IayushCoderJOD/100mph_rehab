import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DAY_LABEL, DayOfWeek, ScheduleMap, SessionType, WEEK_DAYS, findSessionType } from '@/data';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';
import { SessionChip } from './SessionChip';

const ROW_HEIGHT = 64;
const ROW_GAP = 8;
/** Distance between two rows — one drag of this much moves a session one day. */
const PITCH = ROW_HEIGHT + ROW_GAP;
const CHIP_WIDTH = 152;
const CHIP_HEIGHT = 44;
const CHIP_INSET = 12;
const CHIP_TOP = (ROW_HEIGHT - CHIP_HEIGHT) / 2;
const LAST = WEEK_DAYS.length - 1;

const SPRING = { damping: 20, stiffness: 240, mass: 0.7 };

type Drag = {
  /** Index being dragged, or -1 when idle. */
  activeIndex: SharedValue<number>;
  /** Index the chip would land on if released now. */
  targetIndex: SharedValue<number>;
  translateY: SharedValue<number>;
  /**
   * True for the frame a swap is committed: the chips must take their new
   * positions instantly, because the data moved under them and animating
   * would show them gliding away from where they already belong.
   */
  snap: SharedValue<boolean>;
  /**
   * Bumped on every drag. A settle animation that gets interrupted still has
   * to commit its swap, but must not reset a drag that has already started.
   */
  token: SharedValue<number>;
};

type ScheduleEditorProps = {
  schedule: ScheduleMap;
  sessionTypes: SessionType[];
  onSwap: (a: DayOfWeek, b: DayOfWeek) => void;
};

/**
 * The weekly plan as seven fixed day slots. Days never move — the sessions do.
 * Dragging a session onto another day swaps the two, which is the only edit
 * that keeps the week's session count intact.
 *
 * Rows and chips are two absolutely positioned layers so a lifted chip can
 * travel the full height of the list without being clipped by its row.
 */
export function ScheduleEditor({ schedule, sessionTypes, onSwap }: ScheduleEditorProps) {
  const drag: Drag = {
    activeIndex: useSharedValue(-1),
    targetIndex: useSharedValue(-1),
    translateY: useSharedValue(0),
    snap: useSharedValue(false),
    token: useSharedValue(0),
  };

  const commit = useCallback(
    (from: number, to: number, token: number) => {
      // Land the shared values and the data in the same tick: after the swap
      // the chip at `to` already renders the dragged session at offset zero.
      if (drag.token.value === token) {
        drag.snap.value = true;
        drag.translateY.value = 0;
        drag.activeIndex.value = -1;
        drag.targetIndex.value = -1;
      }
      onSwap(WEEK_DAYS[from], WEEK_DAYS[to]);
    },
    [drag.token, drag.snap, drag.translateY, drag.activeIndex, drag.targetIndex, onSwap]
  );

  return (
    <View style={[styles.board, { height: WEEK_DAYS.length * PITCH - ROW_GAP }]}>
      {WEEK_DAYS.map((day, index) => (
        <DayRow key={day} day={day} index={index} drag={drag} />
      ))}

      {WEEK_DAYS.map((day, index) => (
        <DraggableChip
          key={day}
          index={index}
          sessionType={findSessionType(sessionTypes, schedule[day])}
          drag={drag}
          onCommit={commit}
        />
      ))}
    </View>
  );
}

function DayRow({ day, index, drag }: { day: DayOfWeek; index: number; drag: Drag }) {
  const { theme } = useTheme();
  const idle = { border: theme.colors.border, background: theme.colors.surface };
  const target = { border: theme.colors.accentBorder, background: theme.colors.accentSoft };

  const highlight = useAnimatedStyle(() => {
    const dragging = drag.activeIndex.value !== -1;
    const isTarget =
      dragging && drag.targetIndex.value === index && drag.targetIndex.value !== drag.activeIndex.value;

    return {
      borderColor: isTarget ? target.border : idle.border,
      backgroundColor: isTarget ? target.background : idle.background,
    };
  });

  return (
    <Animated.View
      style={[
        styles.row,
        { top: index * PITCH, borderRadius: theme.radius.md },
        highlight,
      ]}
    >
      <Text variant="heading">{DAY_LABEL[day]}</Text>
    </Animated.View>
  );
}

function DraggableChip({
  index,
  sessionType,
  drag,
  onCommit,
}: {
  index: number;
  sessionType: SessionType | null;
  drag: Drag;
  onCommit: (from: number, to: number, token: number) => void;
}) {
  const { activeIndex, targetIndex, translateY, snap, token } = drag;
  // Rest days are drop targets, not drag handles — there is nothing to move.
  const draggable = !!sessionType;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(draggable)
        .onStart(() => {
          snap.value = false;
          token.value += 1;
          activeIndex.value = index;
          targetIndex.value = index;
          translateY.value = 0;
        })
        .onUpdate((event) => {
          const offset = Math.min(
            (LAST - index) * PITCH,
            Math.max(-index * PITCH, event.translationY)
          );
          translateY.value = offset;
          targetIndex.value = index + Math.round(offset / PITCH);
        })
        .onEnd(() => {
          const from = activeIndex.value;
          const to = targetIndex.value;
          if (from < 0) return;

          if (to === from) {
            // Dropping the chip back where it started: clearing activeIndex
            // hands it to the resting style, which springs it home.
            activeIndex.value = -1;
            targetIndex.value = -1;
            translateY.value = 0;
            return;
          }

          // Commit even if the settle is interrupted — the swap the user asked
          // for should never be lost to an animation that got cut short.
          const dragToken = token.value;
          translateY.value = withTiming((to - from) * PITCH, { duration: 150 }, () => {
            runOnJS(onCommit)(from, to, dragToken);
          });
        })
        .onFinalize((_event, success) => {
          // A cancelled gesture (interrupted touch, app backgrounded) never
          // reaches onEnd, and must not leave the board stuck mid-drag.
          if (!success && activeIndex.value === index) {
            activeIndex.value = -1;
            targetIndex.value = -1;
          }
        }),
    [draggable, index, activeIndex, targetIndex, translateY, snap, token, onCommit]
  );

  const animated = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index;

    if (isActive) {
      return {
        transform: [{ translateY: translateY.value }, { scale: 1.04 }],
        zIndex: 20,
        elevation: 12,
        shadowOpacity: 0.35,
      };
    }

    // The chip being displaced previews the swap by sliding into the slot the
    // dragged chip came from.
    const isTarget = activeIndex.value !== -1 && targetIndex.value === index;
    const shift = isTarget ? (activeIndex.value - index) * PITCH : 0;

    return {
      transform: snap.value
        ? [{ translateY: shift }, { scale: 1 }]
        : [{ translateY: withSpring(shift, SPRING) }, { scale: withSpring(1, SPRING) }],
      zIndex: 1,
      elevation: 0,
      shadowOpacity: 0,
    };
  });

  const chip = (
    <Animated.View
      style={[
        styles.chipSlot,
        { top: index * PITCH + CHIP_TOP },
        animated,
      ]}
    >
      <SessionChip sessionType={sessionType} showGrip />
    </Animated.View>
  );

  return draggable ? <GestureDetector gesture={pan}>{chip}</GestureDetector> : chip;
}

const styles = StyleSheet.create({
  board: { position: 'relative' },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderWidth: 1,
    justifyContent: 'center',
    paddingLeft: 18,
  },
  chipSlot: {
    position: 'absolute',
    right: CHIP_INSET,
    width: CHIP_WIDTH,
    height: CHIP_HEIGHT,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
});
