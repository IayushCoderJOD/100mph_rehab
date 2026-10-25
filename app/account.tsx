import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/common';
import { DetailRow } from '@/components/settings';
import { features } from '@/config/features';
import { Button, Card, HeartBadge, Screen, Text } from '@/components/ui';
import { ageFrom, formatLongDate } from '@/data';
import { useI18n } from '@/i18n';
import { useMembership } from '@/membership/MembershipProvider';
import { useDismiss } from '@/navigation/useDismiss';

export default function AccountScreen() {
  const router = useRouter();
  const dismiss = useDismiss('/(tabs)/settings');
  const { plan, isActive } = useMembership();
  const { user } = useAuth();
  const { isAdmin, role } = useAccess();
  const { t, localize } = useI18n();
  const age = user ? ageFrom(user.date_of_birth) : null;

  return (
    <Screen scroll>
      <PageHeader
        title={t.account.title}
        subtitle={isAdmin ? t.account.adminSub : t.account.memberSub}
        onBack={dismiss}
      />

      {!user ? null : (
        <>
      <Card style={styles.identity}>
        <HeartBadge size={64} glow />
        <View style={styles.identityText}>
          <Text variant="heading">{user.full_name}</Text>
          <Text variant="caption" color="textSecondary">
            {(isAdmin ? t.account.adminSince : t.common.memberSince)(formatLongDate(user.member_since))}
          </Text>
        </View>
      </Card>

      <Card style={styles.details}>
        <DetailRow label={t.common.email} value={user.email} />
        <DetailRow label={t.common.phone} value={user.phone || t.common.notGiven} />
        <DetailRow
          label={t.common.joined}
          value={formatLongDate(user.member_since)}
          last={!isAdmin && !features.membership}
        />
        {isAdmin ? (
          <DetailRow label={t.account.role} value={role ? t.roles[role] : '—'} last />
        ) : features.membership ? (
          <DetailRow
            label={t.account.membership}
            value={`${localize.plan(plan).name}${isActive ? '' : t.account.cancelledSuffix}`}
            last
          />
        ) : null}
      </Card>

      {!isAdmin ? (
        <>
          <Text variant="heading" style={styles.sectionTitle}>
            {t.account.yourDetails}
          </Text>
          <Card style={styles.details}>
            <DetailRow label={t.common.age} value={age !== null ? `${age}` : t.common.notGiven} />
            <DetailRow
              label={t.common.height}
              value={user.height_cm != null ? t.common.cm(user.height_cm) : t.common.notGiven}
            />
            <DetailRow
              label={t.common.weight}
              value={user.weight_kg != null ? t.common.kg(user.weight_kg) : t.common.notGiven}
              last
            />
          </Card>
          <Button
            label={
              user.date_of_birth || user.height_cm != null || user.weight_kg != null
                ? t.account.editDetails
                : t.account.addDetails
            }
            variant="secondary"
            onPress={() => router.push('/edit-profile')}
            style={styles.edit}
          />
        </>
      ) : null}

          <Text variant="heading" style={styles.sectionTitle}>
            {t.account.security}
          </Text>
          <Button
            label={t.account.changePassword}
            variant="secondary"
            onPress={() => router.push('/change-password')}
            style={styles.edit}
          />
        </>
      )}

      <Text variant="caption" color="textMuted" style={styles.note}>
        {t.account.note}
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
