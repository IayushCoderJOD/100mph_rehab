import { StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/common';
import { ScheduleEditor } from '@/components/schedule';
import { Button, Screen, Text } from '@/components/ui';
import { useDismiss } from '@/navigation/useDismiss';
import { useSchedule } from '@/schedule/ScheduleProvider';

/**
 * Editing the weekly plan. Presented as a modal over whichever screen asked
 * for it, so the schedule can be reached from anywhere in the app.
 */
export default function EditScheduleScreen() {
  const dismiss = useDismiss();
  const { schedule, sessionTypes, swapDays, resetSchedule, isDefault } = useSchedule();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="title" style={styles.heading}>
          Edit Your Schedule
        </Text>
        <IconButton name="close" variant="plain" onPress={dismiss} />
      </View>

      <Text variant="subtitle" color="textSecondary" style={styles.note}>
        Drag and drop sessions to edit your schedule.
      </Text>

      <ScheduleEditor schedule={schedule} sessionTypes={sessionTypes} onSwap={swapDays} />

      <View style={styles.footer}>
        <Button
          label="Reset to Default"
          variant="ghost"
          disabled={isDefault}
          onPress={resetSchedule}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  heading: { flex: 1 },
  note: { marginTop: 12, marginBottom: 28, paddingRight: 40 },
  footer: { marginTop: 'auto', paddingTop: 24 },
});
