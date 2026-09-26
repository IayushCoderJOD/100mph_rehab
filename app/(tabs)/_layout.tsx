import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ColorValue, Platform } from 'react-native';
import { useAccess } from '@/access';
import { useAuth } from '@/auth/AuthProvider';
import { SIDE_RAIL_WIDTH, SideRail } from '@/navigation/SideRail';
import { useProgramData } from '@/program/programData';
import { useBreakpoint } from '@/responsive';
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
  const { isDesktop } = useBreakpoint();
  const { learnContent } = useProgramData();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // `href: null` removes a tab entirely rather than disabling it: a physio has
  // no training plan and no pain log, so those tabs would only ever be empty.
  const memberOnly = isAdmin ? null : undefined;
  const adminOnly = isAdmin ? undefined : null;
  // Learn is a shelf of placeholders until footage is recorded. The screen
  // stays in the tree; the tab appears on its own once any lesson has a video.
  const learnHref = learnContent.some((lesson) => lesson.video_url) ? undefined : null;

  // Keyed on window width rather than on Platform.OS: a bottom bar is wrong on
  // a desktop browser, but it is equally wrong on a landscape iPad, and right
  // in a narrow browser window. Size is the thing that actually decides it.
  return (
    <Tabs
      tabBar={isDesktop ? (props) => <SideRail {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        sceneStyle: {
          backgroundColor: theme.colors.background,
          // The rail is positioned absolutely so it can span the full height,
          // which means the scene has to be told to get out from under it.
          paddingLeft: isDesktop ? SIDE_RAIL_WIDTH : 0,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          // iOS pays for the home indicator; a browser and Android do not.
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
      <Tabs.Screen name="learn" options={{ href: learnHref, tabBarIcon: icon('book') }} />
      <Tabs.Screen name="settings" options={{ tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
