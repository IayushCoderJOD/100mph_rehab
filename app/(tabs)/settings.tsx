import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { SettingsRow, SettingsSection } from '@/components/settings';
import { Button, Card, HeartBadge, Screen, SegmentedControl, Text } from '@/components/ui';
import { socialLinks, supportEmail } from '@/config/brand';
import { formatLongDate, mock } from '@/data';
import { useMembership } from '@/membership/MembershipProvider';
import { useProgram } from '@/program/ProgramProvider';
import { useProgramData } from '@/program/programData';
import { ThemeMode, useTheme } from '@/theme';

const THEME_SEGMENTS: { label: string; value: ThemeMode }[] = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
];

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const { signOut } = useAuth();
  const { clearProgram } = useProgram();
  const { program } = useProgramData();
  const { plan, isActive } = useMembership();
  const router = useRouter();

  const handleLogout = () => {
    signOut();
    clearProgram();
    router.replace('/(auth)/login');
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Nothing installed to handle it — better to do nothing than to crash.
    });
  };

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        Your Settings
      </Text>

      <Card style={styles.userCard}>
        <View style={styles.userRow}>
          <HeartBadge size={56} glow />
          <View style={styles.userText}>
            <Text variant="heading">{mock.user.full_name}</Text>
            <Text variant="caption" color="textSecondary">
              Member since {formatLongDate(mock.user.member_since)}
            </Text>
          </View>
        </View>
      </Card>

      <SettingsSection label="Your Membership">
        <SettingsRow
          icon="person-outline"
          title="My Account"
          subtitle="Email, phone and member details"
          onPress={() => router.push('/account')}
        />
        <SettingsRow
          icon="card-outline"
          title="Manage Membership"
          subtitle={isActive ? 'Change duration or cancel' : 'Cancelled — resume any time'}
          value={plan.name}
          onPress={() => router.push('/membership')}
        />
        <SettingsRow
          icon="calendar-outline"
          title="Edit Schedule"
          subtitle="Choose which days you train"
          onPress={() => router.push('/edit-schedule')}
        />
        <SettingsRow
          icon="body-outline"
          title="Your Program"
          subtitle="Switch to another program"
          value={program.name}
          onPress={() => router.push('/programs')}
        />
      </SettingsSection>

      <SettingsSection label="Appearance">
        <View style={styles.appearance}>
          <Text variant="bodyStrong">Theme</Text>
          <Text variant="caption" color="textSecondary" style={styles.appearanceNote}>
            Choose how the app looks.
          </Text>
          <View style={{ marginTop: theme.spacing(3) }}>
            <SegmentedControl segments={THEME_SEGMENTS} value={mode} onChange={setMode} />
          </View>
        </View>
      </SettingsSection>

      <SettingsSection label="Support" footnote={`We answer every mail at ${supportEmail}.`}>
        <SettingsRow
          icon="mail-outline"
          title="Help & Support"
          subtitle={supportEmail}
          external
          onPress={() =>
            openUrl(
              `mailto:${supportEmail}?subject=${encodeURIComponent('100mph app support')}`
            )
          }
        />
      </SettingsSection>

      <SettingsSection label="Follow 100mph">
        {socialLinks.map((link) => (
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

      <View style={styles.logout}>
        <Button label="Logout" variant="secondary" onPress={handleLogout} />
      </View>
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
  logout: { marginTop: 32 },
});
