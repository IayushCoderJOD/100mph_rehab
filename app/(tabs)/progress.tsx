import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCheckIns } from '@/checkin/CheckInProvider';
import { PainTrendChart } from '@/components/charts';
import { describePain } from '@/components/checkin';
import { SessionStats } from '@/components/session';
import { Button, Card, Loader, Screen, Text } from '@/components/ui';
import { formatShortDate, formatLongDate } from '@/data';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function ProgressScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { checkIns, summary, recent, averageScore, hasCheckedInToday, loading, error, reload } =
    useCheckIns();

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

  if (error && checkIns.length === 0) {
    return (
      <Screen scroll>
        <Text variant="title" align="center" style={styles.pageTitle}>
          {t.progress.title}
        </Text>
        <Card style={styles.empty}>
          <Text variant="heading" align="center">
            {t.progress.loadFailed}
          </Text>
          <Text variant="subtitle" color="textSecondary" align="center" style={styles.emptyNote}>
            {error}
          </Text>
          <Button label={t.common.tryAgain} variant="secondary" onPress={() => void reload()} style={styles.emptyAction} />
        </Card>
      </Screen>
    );
  }

  if (loading && checkIns.length === 0) {
    return (
      <Screen scroll>
        <Text variant="title" align="center" style={styles.pageTitle}>
          {t.progress.title}
        </Text>
        <Loader />
      </Screen>
    );
  }

  if (checkIns.length === 0) {
    return (
      <Screen scroll>
        <Text variant="title" align="center" style={styles.pageTitle}>
          {t.progress.title}
        </Text>
        <Card style={styles.empty}>
          <Text variant="heading" align="center">
            {t.progress.emptyTitle}
          </Text>
          <Text variant="subtitle" color="textSecondary" align="center" style={styles.emptyNote}>
            {t.progress.emptyNote}
          </Text>
          <Button label={t.progress.dailyCheckIn} onPress={() => router.push('/check-in')} style={styles.emptyAction} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        {t.progress.title}
      </Text>

      <Card>
        <Text variant="label" color="textSecondary" style={styles.kicker}>
          {t.common.painTrend}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.subtitle}>
          {t.progress.scale}
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
                {selectedEntry.pain_location ?? t.common.noLocation}
              </Text>
            </>
          ) : (
            <Text variant="caption" color="textMuted">
              {t.progress.tapPoint}
            </Text>
          )}
        </View>
      </Card>

      <Card style={styles.statsCard}>
        <SessionStats
          stats={[
            { value: latest?.pain_score != null ? `${latest.pain_score}` : '—', label: t.progress.latest },
            { value: weekAvg !== null ? weekAvg.toFixed(1) : '—', label: t.common.weekAvg },
            { value: `${summary?.total_check_ins ?? checkIns.length}`, label: t.common.checkIns },
          ]}
        />
        <SessionStats
          style={styles.statsRow}
          stats={[
            { value: `${summary?.current_streak ?? 0}`, label: t.common.dayStreak },
            { value: `${summary?.total_sessions ?? 0}`, label: t.progress.sessions },
            {
              value: summary?.adherence != null ? `${Math.round(summary.adherence * 100)}%` : '—',
              label: t.common.onPlan4Weeks,
            },
          ]}
        />
        {delta !== null ? (
          <Text variant="caption" color="textSecondary" align="center" style={styles.delta}>
            {delta < 0
              ? t.progress.down(Math.abs(delta).toFixed(1))
              : delta > 0
                ? t.progress.up(delta.toFixed(1))
                : t.common.levelWithLastWeek}
          </Text>
        ) : null}
      </Card>

      {!hasCheckedInToday ? (
        <Button
          label={t.progress.checkInToday}
          onPress={() => router.push('/check-in')}
          style={styles.action}
        />
      ) : null}

      <Text variant="heading" style={styles.sectionTitle}>
        {t.common.recentCheckIns}
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
                {entry.pain_score !== null ? describePain(entry.pain_score).split(t.pain.detailSeparator)[0] : '—'}
              </Text>
            </View>

            <Text variant="caption" color="textSecondary" style={styles.rowNote} numberOfLines={2}>
              {entry.pain_location ?? t.common.noLocation}
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
  statsRow: { marginTop: 22 },
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
