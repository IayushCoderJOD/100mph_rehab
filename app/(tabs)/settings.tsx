import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { LanguageSelect } from '@/components/common';
import { SettingsRow, SettingsSection } from '@/components/settings';
import { Button, Card, HeartBadge, Screen, SegmentedControl, Text } from '@/components/ui';
import { socialLinks, supportEmail } from '@/config/brand';
import { features } from '@/config/features';
import { formatLongDate } from '@/data';
import { useI18n } from '@/i18n';
import { useMembership } from '@/membership/MembershipProvider';
import { usePlan } from '@/plan/PlanProvider';
import { ThemeMode, useTheme } from '@/theme';

const shownSocialLinks = socialLinks.filter((link) => features.socialLinks.includes(link.id));

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const { t, localize } = useI18n();
  const { signOut, user } = useAuth();
  const { can, isAdmin, role } = useAccess();
  const { plan: week, hasPlan } = usePlan();
  const { plan, isActive } = useMembership();
  const router = useRouter();

  const handleLogout = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  const themeSegments: { label: string; value: ThemeMode }[] = [
    { label: t.settings.dark, value: 'dark' },
    { label: t.settings.light, value: 'light' },
  ];

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Nothing installed to handle it — better to do nothing than to crash.
    });
  };

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        {t.settings.title}
      </Text>

      <Card style={styles.userCard}>
        <View style={styles.userRow}>
          <HeartBadge size={56} glow />
          <View style={styles.userText}>
            <Text variant="heading">{user?.full_name ?? t.settings.yourAccount}</Text>
            <Text variant="caption" color="textSecondary">
              {t.common.memberSince(user ? formatLongDate(user.member_since) : '—')}
            </Text>
          </View>
        </View>
      </Card>

      {isAdmin ? (
        <SettingsSection
          label={t.settings.practice}
          footnote={t.settings.signedInAs(role ? t.roles[role] : t.settings.adminFallback)}
        >
          <SettingsRow
            icon="people-outline"
            title={t.settings.clients}
            subtitle={t.settings.clientsSub}
            onPress={() => router.push('/(tabs)/clients')}
          />
          {can('clients.create') ? (
            <SettingsRow
              icon="person-add-outline"
              title={t.settings.createClient}
              subtitle={t.settings.createClientSub}
              onPress={() => router.push('/admin/create-user')}
            />
          ) : null}
          {can('clients.assign_exercise') ? (
            <SettingsRow
              icon="videocam-outline"
              title={t.settings.library}
              subtitle={t.settings.librarySub}
              onPress={() => router.push('/admin/exercises')}
            />
          ) : null}
        </SettingsSection>
      ) : null}

      {can('program.train') ? (
        <SettingsSection label={t.settings.membership}>
          <SettingsRow
            icon="person-outline"
            title={t.settings.myAccount}
            subtitle={t.settings.myAccountSub}
            onPress={() => router.push('/account')}
          />
          {features.membership ? (
            <SettingsRow
              icon="card-outline"
              title={t.settings.manageMembership}
              subtitle={isActive ? t.settings.membershipActive : t.settings.membershipCancelled}
              value={localize.plan(plan).name}
              onPress={() => router.push('/membership')}
            />
          ) : null}
          <SettingsRow
            icon="calendar-outline"
            title={t.settings.yourWeek}
            subtitle={
              hasPlan
                ? t.settings.writtenBy(week?.updated_by_name ?? t.settings.yourPhysio)
                : t.settings.notWritten
            }
            onPress={() => router.push('/(tabs)')}
          />
        </SettingsSection>
      ) : null}

      <SettingsSection label={t.settings.appearance}>
        <View style={styles.appearance}>
          <Text variant="bodyStrong">{t.settings.theme}</Text>
          <Text variant="caption" color="textSecondary" style={styles.appearanceNote}>
            {t.settings.themeNote}
          </Text>
          <View style={{ marginTop: theme.spacing(3) }}>
            <SegmentedControl segments={themeSegments} value={mode} onChange={setMode} />
          </View>
        </View>
      </SettingsSection>

      <SettingsSection label={t.language.label}>
        <View style={styles.language}>
          <Text variant="caption" color="textSecondary" style={styles.languageNote}>
            {t.language.note}
          </Text>
          <LanguageSelect />
        </View>
      </SettingsSection>

      <SettingsSection label={t.settings.support} footnote={t.settings.supportFootnote(supportEmail)}>
        <SettingsRow
          icon="mail-outline"
          title={t.settings.help}
          subtitle={supportEmail}
          external
          onPress={() =>
            openUrl(`mailto:${supportEmail}?subject=${encodeURIComponent('100mph app support')}`)
          }
        />
      </SettingsSection>

      {shownSocialLinks.length > 0 ? (
        <SettingsSection label={t.settings.follow}>
          {shownSocialLinks.map((link) => (
            <SettingsRow
              key={link.id}
              icon={link.icon as keyof typeof Ionicons.glyphMap}
              title={link.label}
              subtitle={link.handle}
              external
              onPress={() => openUrl(link.url)}
            />
          ))}
        </SettingsSection>
      ) : null}

      <View style={styles.logout}>
        <Button label={t.settings.logout} variant="secondary" onPress={handleLogout} />
      </View>

      <SettingsSection>
        <SettingsRow
          icon="trash-outline"
          title={t.settings.deleteAccount}
          subtitle={t.settings.deleteAccountSub}
          tone="danger"
          onPress={() => router.push('/delete-account')}
        />
      </SettingsSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { marginTop: 12, marginBottom: 24 },
  userCard: { marginBottom: 4 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  userText: { flex: 1, gap: 4 },
  appearance: { paddingVertical: 12 },
  appearanceNote: { marginTop: 2 },
  language: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
  languageNote: { flex: 1 },
  logout: { marginTop: 32 },
});
