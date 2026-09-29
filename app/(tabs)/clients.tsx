import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAccess } from '@/access';
import { ClientRow, daysSince } from '@/components/admin';
import { TextField } from '@/components/form';
import { Button, Card, Loader, Screen, SegmentedControl, Text } from '@/components/ui';
import { useDirectory } from '@/directory/DirectoryProvider';

type Filter = 'all' | 'attention' | 'unplanned';

export default function ClientsScreen() {
  const router = useRouter();
  const { roster, loading, error, reload } = useDirectory();
  const { can } = useAccess();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const clients = useMemo(() => {
    const term = query.trim().toLowerCase();

    return roster
      .filter((row) =>
        term.length === 0
          ? true
          : row.user.full_name.toLowerCase().includes(term) ||
            row.user.email.toLowerCase().includes(term)
      )
      .filter((row) =>
        filter === 'attention' ? row.needs_attention : filter === 'unplanned' ? !row.has_plan : true
      )
      // Quiet clients first: the roster is a worklist, not an address book.
      .sort((a, b) => (daysSince(b.last_active_date) ?? 999) - (daysSince(a.last_active_date) ?? 999));
  }, [roster, query, filter]);

  const attentionCount = roster.filter((row) => row.needs_attention).length;
  const unplannedCount = roster.filter((row) => !row.has_plan).length;

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        Clients
      </Text>
      <Text variant="caption" color="textSecondary" align="center" style={styles.pageNote}>
        {roster.length} on the books · {attentionCount} need a nudge
        {unplannedCount > 0 ? ` · ${unplannedCount} without a week` : ''}
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
          { label: 'No week', value: 'unplanned' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <View style={styles.list}>
        {error && roster.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="heading" align="center">
              Could not load the roster
            </Text>
            <Text variant="caption" color="textSecondary" align="center" style={styles.emptyNote}>
              {error}
            </Text>
            <Button label="Try again" variant="secondary" onPress={() => void reload()} style={styles.retry} />
          </Card>
        ) : loading && roster.length === 0 ? (
          <Loader />
        ) : clients.length === 0 ? (
          <Card style={styles.empty}>
            <Text variant="heading" align="center">
              No clients match
            </Text>
            <Text variant="caption" color="textSecondary" align="center" style={styles.emptyNote}>
              {filter === 'attention'
                ? 'Everyone has checked in recently. Good week.'
                : filter === 'unplanned'
                  ? 'Every client has a week written.'
                  : 'Try a different search, or create the account.'}
            </Text>
          </Card>
        ) : (
          clients.map((row) => (
            <ClientRow
              key={row.user.id}
              summary={row}
              onPress={() => router.push(`/admin/client/${row.user.id}`)}
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
  retry: { marginTop: 16 },
});
