import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useTheme } from '@/theme';
import { daysSince } from '../admin/ClientRow';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

type PracticeOverviewProps = {
  /** Admins can provision accounts; coaches cannot. */
  canCreateClient: boolean;
  onOpenRoster: () => void;
  onCreateClient: () => void;
  onOpenClient: (userId: string) => void;
};

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: theme.colors.surface,
          borderColor: accent ? theme.colors.accentBorder : theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text variant="title" color={accent ? 'accentText' : 'textPrimary'}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The practice today, on one screen: who checked in, who trained, who has
 * gone quiet, and who has no week yet. Everything comes from the roster the
 * server computes, so what the coach sees here is what the member logged a
 * minute ago — not a copy on this phone.
 */
export function PracticeOverview({
  canCreateClient,
  onOpenRoster,
  onCreateClient,
  onOpenClient,
}: PracticeOverviewProps) {
  const { theme } = useTheme();
  const { roster, loading, error, reload } = useDirectory();

  const stats = useMemo(() => {
    const active = roster.filter((row) => row.user.status !== 'suspended');
    return {
      clients: active.length,
      checkedInToday: active.filter((row) => row.checked_in_today).length,
      trainedThisWeek: active.filter((row) => row.sessions_this_week > 0).length,
      attention: active.filter((row) => row.needs_attention),
      unplanned: active.filter((row) => !row.has_plan),
      hurting: active
        .filter((row) => row.latest_pain_score != null && row.latest_pain_score >= 7)
        .sort((a, b) => (b.latest_pain_score ?? 0) - (a.latest_pain_score ?? 0)),
    };
  }, [roster]);

  return (
    <View style={styles.wrap}>
      <Card variant="alt" style={styles.card}>
        <Text variant="label" color="textSecondary" align="center" style={styles.kicker}>
          Your Practice · Today
        </Text>
        <Text variant="title" align="center" style={styles.headline}>
          {error
            ? 'Could not load the roster'
            : loading && roster.length === 0
              ? 'Loading…'
              : stats.attention.length === 0
                ? 'All caught up'
                : `${stats.attention.length} need a nudge`}
        </Text>
        {error ? (
          <>
            <Text variant="caption" color="textSecondary" align="center" style={styles.note}>
              {error}
            </Text>
            <Button label="Try again" variant="secondary" onPress={() => void reload()} style={styles.retry} />
          </>
        ) : null}

        <View style={styles.grid}>
          <Stat value={`${stats.clients}`} label="Active clients" />
          <Stat value={`${stats.checkedInToday}`} label="Checked in today" />
          <Stat value={`${stats.trainedThisWeek}`} label="Trained this week" />
          <Stat value={`${stats.unplanned.length}`} label="No week yet" accent={stats.unplanned.length > 0} />
        </View>

        <Button label="Open Clients" onPress={onOpenRoster} style={styles.primary} />
        {canCreateClient ? (
          <Button label="Create Client Account" variant="secondary" onPress={onCreateClient} style={styles.secondary} />
        ) : null}
      </Card>

      {stats.attention.length > 0 ? (
        <Card>
          <Text variant="heading">Worth a call</Text>
          <Text variant="caption" color="textSecondary" style={styles.note}>
            Quiet for a week, under 60% on plan, or reporting pain of 7 or more.
          </Text>
          <View style={styles.list}>
            {stats.attention.slice(0, 5).map((row, index) => {
              const quiet = daysSince(row.last_active_date);
              return (
                <Pressable
                  key={row.user.id}
                  onPress={() => onOpenClient(row.user.id)}
                  accessibilityRole="button"
                  style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
                >
                  <View style={styles.rowBody}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {row.user.full_name}
                    </Text>
                    <Text variant="caption" color="textSecondary" numberOfLines={1}>
                      {row.latest_pain_score != null && row.latest_pain_score >= 7
                        ? `Pain at ${row.latest_pain_score}/10`
                        : quiet === null
                          ? 'Never checked in'
                          : `Quiet for ${quiet} day${quiet === 1 ? '' : 's'}`}
                      {row.adherence != null ? ` · ${Math.round(row.adherence * 100)}% on plan` : ''}
                    </Text>
                  </View>
                  <Text variant="caption" color="accentText">
                    Open
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {stats.unplanned.length > 0 ? (
        <Card>
          <Text variant="heading">Waiting for a week</Text>
          <Text variant="caption" color="textSecondary" style={styles.note}>
            Accounts created but nothing to train on yet.
          </Text>
          <View style={styles.list}>
            {stats.unplanned.slice(0, 5).map((row, index) => (
              <Pressable
                key={row.user.id}
                onPress={() => onOpenClient(row.user.id)}
                accessibilityRole="button"
                style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
              >
                <Text variant="bodyStrong" numberOfLines={1} style={styles.rowBody}>
                  {row.user.full_name}
                </Text>
                <Text variant="caption" color="accentText">
                  Write week
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  card: { paddingVertical: 24 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.4 },
  headline: { marginTop: 6 },
  note: { marginTop: 6 },
  retry: { marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  stat: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, padding: 14, gap: 2 },
  primary: { marginTop: 20 },
  secondary: { marginTop: 10 },
  list: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBody: { flex: 1, gap: 2 },
});
