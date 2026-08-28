import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { clientStats } from '@/admin';
import { useDirectory } from '@/directory/DirectoryProvider';
import { useTheme } from '@/theme';
import { SessionStats } from '../session/SessionStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

type PracticeOverviewProps = {
  /** Admins can provision accounts; coaches cannot. */
  canCreateClient: boolean;
  onOpenRoster: () => void;
  onCreateClient: () => void;
};

/**
 * What staff open the app for: who has gone quiet, and the way into the
 * roster. This is the staff counterpart to SessionSummaryCard — the same slot
 * on the same screen, answering the question that role actually has.
 */
export function PracticeOverview({
  canCreateClient,
  onOpenRoster,
  onCreateClient,
}: PracticeOverviewProps) {
  const { theme } = useTheme();
  const { users } = useDirectory();

  const { total, attention } = useMemo(() => {
    const members = users.filter((u) => u.role === 'member');
    return {
      total: members.length,
      attention: members.filter((m) => clientStats(m.id).needsAttention).length,
    };
  }, [users]);

  return (
    <Card variant="alt" style={styles.card}>
      <Text variant="label" color="textSecondary" align="center" style={styles.kicker}>
        Your Practice
      </Text>
      <Text variant="title" align="center" style={styles.headline}>
        {attention === 0 ? 'All caught up' : `${attention} need a nudge`}
      </Text>

      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

      <SessionStats
        stats={[
          { value: `${total}`, label: 'Clients' },
          { value: `${attention}`, label: 'Need Attention' },
        ]}
      />

      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

      <Button label="Open Clients" onPress={onOpenRoster} />

      {canCreateClient ? (
        <View style={styles.secondary}>
          <Button label="Create Client Account" variant="secondary" onPress={onCreateClient} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 28 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.4 },
  headline: { marginTop: 6 },
  rule: { height: 1, marginVertical: 22 },
  secondary: { marginTop: 12 },
});
