import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { ThemeToggle, Tile, Wordmark } from '@/components/common';
import { Screen, Text } from '@/components/ui';
import { mock } from '@/data';
import { useProgram } from '@/program/ProgramProvider';
import { useTheme } from '@/theme';

/**
 * Program selection — the step between signing in and the main app.
 * Picking a program is what unlocks the tabs.
 */
export default function ProgramsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { programId, selectProgram } = useProgram();

  // Let the rail run edge to edge by cancelling out Screen's gutter.
  const gutter = theme.spacing(5);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  const choose = (id: string) => {
    selectProgram(id);
    router.replace('/(tabs)');
  };

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <ThemeToggle />
      </View>

      <View style={styles.brand}>
        <Wordmark height={72} />
      </View>

      <Text variant="display" align="center" style={styles.hero}>
        Choose your program
      </Text>
      <Text variant="subtitle" color="textSecondary" align="center" style={styles.heroNote}>
        Physiotherapist-led programs, built around you. You can switch later.
      </Text>

      <Text variant="heading" style={styles.section}>
        Programs
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -gutter }}
        contentContainerStyle={[styles.rail, { paddingHorizontal: gutter }]}
      >
        {mock.programs.map((p) => (
          <Tile
            key={p.id}
            icon={p.icon}
            title={p.name}
            subtitle={p.tagline}
            onPress={() => choose(p.id)}
            style={styles.railCard}
          />
        ))}
      </ScrollView>

      <Text variant="heading" style={styles.section}>
        Learn about the body
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -gutter }}
        contentContainerStyle={[styles.rail, { paddingHorizontal: gutter }]}
      >
        {mock.humanBodyTopics.map((t) => (
          <Tile
            key={t.id}
            icon={t.icon}
            title={t.title}
            subtitle={t.subtitle}
            onPress={() => router.push('/(tabs)/learn')}
            style={styles.railCard}
          />
        ))}
      </ScrollView>

      <Text variant="caption" color="textMuted" align="center" style={styles.note}>
        {programId
          ? 'Tap a program to switch to it.'
          : 'Pick the program your coach set up for you to get started.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  brand: { alignItems: 'center', marginTop: 12 },
  hero: { marginTop: 28 },
  heroNote: { marginTop: 8, marginBottom: 8 },
  section: { marginTop: 28, marginBottom: 14 },
  rail: { gap: 12 },
  // Fixed width so a sliver of the next card shows and the rail reads as scrollable.
  railCard: { width: 190, flexBasis: 'auto', flexGrow: 0 },
  note: { marginTop: 28, marginBottom: 8, paddingHorizontal: 16 },
});
