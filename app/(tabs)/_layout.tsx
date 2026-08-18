import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ColorValue, Platform } from 'react-native';
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

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

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
      <Tabs.Screen name="progress" options={{ tabBarIcon: icon('analytics') }} />
      <Tabs.Screen name="learn" options={{ tabBarIcon: icon('book') }} />
      <Tabs.Screen name="settings" options={{ tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
