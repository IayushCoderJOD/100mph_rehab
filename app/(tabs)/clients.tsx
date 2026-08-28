import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { clientStats } from '@/admin';
import { useAccess } from '@/access';
import { ClientRow } from '@/components/admin';
import { TextField } from '@/components/form';
import { Button, Card, Screen, SegmentedControl, Text } from '@/components/ui';
import { mock } from '@/data';
import { useDirectory } from '@/directory/DirectoryProvider';

type Filter = 'all' | 'attention';

export default function ClientsScreen() {
  const router = useRouter();
  const { users } = useDirectory();
  const { can } = useAccess();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const clients = useMemo(() => {
    const term = query.trim().toLowerCase();

    return users
      .filter((u) => u.role === 'member')
      .map((client) => ({
        client,
        stats: clientStats(client.id),
        programName:
          mock.programs.find((p) => p.id === client.active_program_id)?.name ?? 'No program',
      }))
      .filter(({ client }) =>
        term.length === 0
          ? true
          : client.full_name.toLowerCase().includes(term) ||
            client.email.toLowerCase().includes(term)
      )
      .filter(({ stats }) => (filter === 'attention' ? stats.needsAttention : true))
      // Quiet clients first: the roster is a worklist, not an address book.
      .sort((a, b) => (b.stats.daysSinceCheckIn ?? 99) - (a.stats.daysSinceCheckIn ?? 99));
  }, [users, query, filter]);

  const memberCount = users.filter((u) => u.role === 'member').length;

  const attentionCount = useMemo(
    () =>
      users.filter((u) => u.role === 'member' && clientStats(u.id).needsAttention).length,
    [users]
  );

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        Clients
      </Text>
      <Text variant="caption" color="textSecondary" align="center" style={styles.pageNote}>
        {memberCount} on the books · {attentionCount} need a nudge
      </Text>

      {can('clients.create') ? (
        <Button
          label="Create Client Account"
          onPress={() => router.push('/admin/create-user')}
          style={styles.create}
        />
      ) : null}

      <View style={styles.search}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email"
          autoCapitalize="none"
        />
      </View>

      <SegmentedControl<Filter>
        segments={[
          { label: 'All', value: 'all' },
          { label: 'Needs attention', value: 'attention' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <View style={styles.list}>
        {clients.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="heading" align="center">
              No clients match
            </Text>
            <Text variant="caption" color="textSecondary" align="center" style={styles.emptyNote}>
              {filter === 'attention'
                ? 'Everyone has checked in recently. Good week.'
                : 'Try a different search, or create the account.'}
            </Text>
          </Card>
        ) : (
          clients.map(({ client, stats, programName }) => (
            <ClientRow
              key={client.id}
              client={client}
              stats={stats}
              programName={programName}
              onPress={() => router.push(`/admin/client/${client.id}`)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { marginTop: 12 },
  pageNote: { marginTop: 4 },
  create: { marginTop: 24 },
  search: { marginTop: 18, marginBottom: 16 },
  list: { gap: 10, marginTop: 20 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyNote: { marginTop: 6 },
});
