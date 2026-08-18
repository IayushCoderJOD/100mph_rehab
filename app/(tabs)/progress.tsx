import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCheckIns } from '@/checkin/CheckInProvider';
import { PainTrendChart } from '@/components/charts';
import { describePain } from '@/components/checkin';
import { SessionStats } from '@/components/session';
import { Button, Card, Screen, Text } from '@/components/ui';
import { formatShortDate, formatLongDate } from '@/data';
import { useTheme } from '@/theme';

export default function ProgressScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { checkIns, recent, averageScore, hasCheckedInToday } = useCheckIns();

  const [selected, setSelected] = useState<number | null>(null);

  const history = recent(14);
  const trend = history.map((entry) => ({ date: entry.date, score: entry.pain_score ?? 0 }));
  const latest = history[history.length - 1] ?? null;

  const weekAvg = averageScore(7);
  const previousWindow = checkIns
    .filter((entry) => entry.pain_score !== null)
    .slice(-14, -7);
  const previousAvg =
    previousWindow.length > 0
      ? previousWindow.reduce((sum, e) => sum + (e.pain_score ?? 0), 0) / previousWindow.length
      : null;

  const delta = weekAvg !== null && previousAvg !== null ? weekAvg - previousAvg : null;
  const selectedEntry = selected !== null ? history[selected] : null;

  if (checkIns.length === 0) {
    return (
      <Screen scroll>
        <Text variant="title" align="center" style={styles.pageTitle}>
          Progress
        </Text>
        <Card style={styles.empty}>
          <Text variant="heading" align="center">
            Nothing logged yet
          </Text>
          <Text variant="subtitle" color="textSecondary" align="center" style={styles.emptyNote}>
            Your pain trend is built from daily check-ins. Log today and the graph starts here.
          </Text>
          <Button label="Daily Check In" onPress={() => router.push('/check-in')} style={styles.emptyAction} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        Progress
      </Text>

      <Card>
        <Text variant="label" color="textSecondary" style={styles.kicker}>
          Pain Trend
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.subtitle}>
          Scored 0–10 each day · lower is better
        </Text>

        <View style={styles.chart}>
          <PainTrendChart
            points={trend}
            height={200}
            selectedIndex={selected}
            onSelect={(index) => setSelected(index === selected ? null : index)}
          />
        </View>

        <View style={[styles.readout, { borderTopColor: theme.colors.border }]}>
          {selectedEntry ? (
            <>
              <Text variant="bodyStrong">
                {formatLongDate(selectedEntry.date)} · {selectedEntry.pain_score}/10
              </Text>
              <Text variant="caption" color="textSecondary" style={styles.readoutNote}>
                {selectedEntry.pain_location ?? 'No location noted.'}
              </Text>
            </>
          ) : (
            <Text variant="caption" color="textMuted">
              Tap any point to see that day.
            </Text>
          )}
        </View>
      </Card>

      <Card style={styles.statsCard}>
        <SessionStats
          stats={[
            { value: latest?.pain_score != null ? `${latest.pain_score}` : '—', label: 'Latest' },
            { value: weekAvg !== null ? weekAvg.toFixed(1) : '—', label: '7-day avg' },
            { value: `${checkIns.length}`, label: 'Check-ins' },
          ]}
        />
        {delta !== null ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.delta}>
            {delta < 0
              ? `Down ${Math.abs(delta).toFixed(1)} points on the week before.`
              : delta > 0
                ? `Up ${delta.toFixed(1)} points on the week before.`
                : 'Level with the week before.'}
          </Text>
        ) : null}
      </Card>

      {!hasCheckedInToday ? (
        <Button
          label="Check In For Today"
          onPress={() => router.push('/check-in')}
          style={styles.action}
        />
      ) : null}

      <Text variant="heading" style={styles.sectionTitle}>
        Recent Check-Ins
      </Text>

      <Card style={styles.list}>
        {[...history].reverse().map((entry, index) => (
          <View
            key={entry.date}
            style={[
              styles.row,
              index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border },
            ]}
          >
            <View style={styles.rowDate}>
              <Text variant="bodyStrong">{formatShortDate(entry.date)}</Text>
              <Text variant="caption" color="textMuted">
                {entry.pain_score !== null ? describePain(entry.pain_score).split(' —')[0] : '—'}
              </Text>
            </View>

            <Text variant="caption" color="textSecondary" style={styles.rowNote} numberOfLines={2}>
              {entry.pain_location ?? 'No location noted.'}
            </Text>

            <View
              style={[
                styles.badge,
                { borderColor: theme.colors.border, borderRadius: theme.radius.sm },
              ]}
            >
              <Text variant="bodyStrong">{entry.pain_score ?? '—'}</Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { marginTop: 12, marginBottom: 24 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyNote: { marginTop: 6, paddingHorizontal: 8 },
  emptyAction: { marginTop: 24 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2 },
  subtitle: { marginTop: 4 },
  chart: { marginTop: 16 },
  readout: { borderTopWidth: 1, marginTop: 8, paddingTop: 14 },
  readoutNote: { marginTop: 2 },
  statsCard: { marginTop: 16, paddingVertical: 22 },
  delta: { marginTop: 16 },
  action: { marginTop: 16 },
  sectionTitle: { marginTop: 32, marginBottom: 12 },
  list: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  rowDate: { width: 66, gap: 2 },
  rowNote: { flex: 1 },
  badge: {
    minWidth: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
