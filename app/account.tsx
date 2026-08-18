import { StyleSheet, View } from 'react-native';
import { PageHeader } from '@/components/common';
import { DetailRow } from '@/components/settings';
import { Card, HeartBadge, Screen, Text } from '@/components/ui';
import { formatLongDate, mock } from '@/data';
import { useMembership } from '@/membership/MembershipProvider';
import { useDismiss } from '@/navigation/useDismiss';
import { useProgramData } from '@/program/programData';

export default function AccountScreen() {
  const dismiss = useDismiss('/(tabs)/settings');
  const { program } = useProgramData();
  const { plan, isActive } = useMembership();
  const user = mock.user;

  return (
    <Screen scroll>
      <PageHeader title="My Account" subtitle="Your member details" onBack={dismiss} />

      <Card style={styles.identity}>
        <HeartBadge size={64} glow />
        <View style={styles.identityText}>
          <Text variant="heading">{user.full_name}</Text>
          <Text variant="caption" color="textSecondary">
            Member since {formatLongDate(user.member_since)}
          </Text>
        </View>
      </Card>

      <Card style={styles.details}>
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Phone" value={user.phone} />
        <DetailRow label="Joined" value={formatLongDate(user.member_since)} />
        <DetailRow label="Program" value={program.name} />
        <DetailRow
          label="Membership"
          value={`${plan.name}${isActive ? '' : ' · Cancelled'}`}
          last
        />
      </Card>

      <Text variant="caption" color="textMuted" style={styles.note}>
        Need something here changed? Drop us a line from Help & Support and we will sort it out.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24 },
  identityText: { flex: 1, gap: 4 },
  details: { marginTop: 16, paddingVertical: 4 },
  note: { marginTop: 20, paddingHorizontal: 4 },
});
