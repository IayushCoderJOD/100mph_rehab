import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PainTrendChart } from '@/components/charts';
import { PainScale, describePain } from '@/components/checkin';
import { IconButton } from '@/components/common';
import { TextField } from '@/components/form';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useCheckIns } from '@/checkin/CheckInProvider';
import { formatLongDate } from '@/data';
import { useDismiss } from '@/navigation/useDismiss';

export default function CheckInScreen() {
  const dismiss = useDismiss();
  const { todayCheckIn, todayIso, saveCheckIn, recent } = useCheckIns();

  const [score, setScore] = useState<number | null>(todayCheckIn?.pain_score ?? null);
  const [location, setLocation] = useState(todayCheckIn?.pain_location ?? '');

  const isUpdate = !!todayCheckIn?.checked_in;
  const trend = recent(14).map((entry) => ({ date: entry.date, score: entry.pain_score ?? 0 }));

  const save = () => {
    if (score === null) return;
    saveCheckIn({ pain_score: score, pain_location: location });
    dismiss();
  };

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            {formatLongDate(todayIso)}
          </Text>
          <Text variant="title">Daily Check In</Text>
        </View>
        <IconButton name="close" variant="plain" onPress={dismiss} />
      </View>

      <Card style={styles.block}>
        <Text variant="heading">How is your pain today?</Text>
        <Text variant="caption" color="textSecondary" style={styles.blockNote}>
          Rate it from 0 to 10, however it felt on average across the day.
        </Text>

        <View style={styles.score}>
          <Text variant="display" align="center">
            {score === null ? '—' : score}
          </Text>
          <Text variant="subtitle" color={score === null ? 'textMuted' : 'textSecondary'} align="center">
            {score === null ? 'Pick a number below' : describePain(score)}
          </Text>
        </View>

        <PainScale value={score} onChange={setScore} />
      </Card>

      <Card style={styles.block}>
        <Text variant="heading">Where did you feel it?</Text>
        <Text variant="caption" color="textSecondary" style={styles.blockNote}>
          Be as specific as you can — the exact spot matters more than the words.
        </Text>
        <View style={styles.field}>
          <TextField
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. lower back, left side, worse when sitting"
            autoCapitalize="sentences"
            multiline
            maxLength={280}
          />
        </View>
      </Card>

      <Button
        label={isUpdate ? 'Update Check In' : 'Save Check In'}
        disabled={score === null}
        onPress={save}
        style={styles.save}
      />

      {trend.length > 1 ? (
        <Card style={styles.trend}>
          <Text variant="heading">Your pain so far</Text>
          <Text variant="caption" color="textSecondary" style={styles.blockNote}>
            Last {trend.length} check-ins · lower is better
          </Text>
          <View style={styles.chart}>
            <PainTrendChart points={trend} height={150} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  headerText: { flex: 1, gap: 2 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2 },
  block: { marginTop: 20 },
  blockNote: { marginTop: 4 },
  score: { marginTop: 20, marginBottom: 20, gap: 4 },
  field: { marginTop: 16 },
  save: { marginTop: 24 },
  trend: { marginTop: 20 },
  chart: { marginTop: 14 },
});
