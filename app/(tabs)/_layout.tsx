import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ColorValue, Platform } from 'react-native';
import { useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

type IoniconName = keyof typeof Ionicons.glyphMap;

const icon =
  (name: IoniconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );

export default function TabsLayout() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { isAdmin } = useAccess();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // `href: null` removes a tab entirely rather than disabling it: a physio has
  // no training plan and no pain log, so those tabs would only ever be empty.
  const memberOnly = isAdmin ? null : undefined;
  const adminOnly = isAdmin ? undefined : null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.medium },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: icon('home') }} />
      <Tabs.Screen name="clients" options={{ href: adminOnly, tabBarIcon: icon('people') }} />
      <Tabs.Screen name="plan" options={{ href: memberOnly, tabBarIcon: icon('barbell') }} />
      <Tabs.Screen name="progress" options={{ href: memberOnly, tabBarIcon: icon('analytics') }} />
      <Tabs.Screen name="learn" options={{ tabBarIcon: icon('book') }} />
      <Tabs.Screen name="settings" options={{ tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
