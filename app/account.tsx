import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ROLE_LABEL, useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/common';
import { DetailRow } from '@/components/settings';
import { features } from '@/config/features';
import { Button, Card, HeartBadge, Screen, Text } from '@/components/ui';
import { ageFrom, formatLongDate } from '@/data';
import { useMembership } from '@/membership/MembershipProvider';
import { useDismiss } from '@/navigation/useDismiss';

export default function AccountScreen() {
  const router = useRouter();
  const dismiss = useDismiss('/(tabs)/settings');
  const { plan, isActive } = useMembership();
  const { user } = useAuth();
  const { isAdmin, role } = useAccess();

  return (
    <Screen scroll>
      <PageHeader
        title="My Account"
        subtitle={isAdmin ? 'Your admin details' : 'Your member details'}
        onBack={dismiss}
      />

      {!user ? null : (
        <>
      <Card style={styles.identity}>
        <HeartBadge size={64} glow />
        <View style={styles.identityText}>
          <Text variant="heading">{user.full_name}</Text>
          <Text variant="caption" color="textSecondary">
            {isAdmin ? 'Admin since' : 'Member since'} {formatLongDate(user.member_since)}
          </Text>
        </View>
      </Card>

      <Card style={styles.details}>
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Phone" value={user.phone || 'Not given'} />
        <DetailRow
          label="Joined"
          value={formatLongDate(user.member_since)}
          last={!isAdmin && !features.membership}
        />
        {isAdmin ? (
          <DetailRow label="Role" value={role ? ROLE_LABEL[role] : '—'} last />
        ) : features.membership ? (
          <DetailRow
            label="Membership"
            value={`${plan.name}${isActive ? '' : ' · Cancelled'}`}
            last
          />
        ) : null}
      </Card>

      {!isAdmin ? (
        <>
          <Text variant="heading" style={styles.sectionTitle}>
            Your Details
          </Text>
          <Card style={styles.details}>
            <DetailRow
              label="Age"
              value={ageFrom(user.date_of_birth) !== null ? `${ageFrom(user.date_of_birth)}` : 'Not given'}
            />
            <DetailRow label="Height" value={user.height_cm != null ? `${user.height_cm} cm` : 'Not given'} />
            <DetailRow label="Weight" value={user.weight_kg != null ? `${user.weight_kg} kg` : 'Not given'} last />
          </Card>
          <Button
            label={user.date_of_birth || user.height_cm != null || user.weight_kg != null ? 'Edit Details' : 'Add Your Details'}
            variant="secondary"
            onPress={() => router.push('/edit-profile')}
            style={styles.edit}
          />
        </>
      ) : null}

          <Text variant="heading" style={styles.sectionTitle}>
            Security
          </Text>
          <Button
            label="Change Password"
            variant="secondary"
            onPress={() => router.push('/change-password')}
            style={styles.edit}
          />
        </>
      )}

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
  sectionTitle: { marginTop: 28 },
  edit: { marginTop: 14 },
  note: { marginTop: 20, paddingHorizontal: 4 },
});
