import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { CheckInProvider } from '@/checkin/CheckInProvider';
import { features } from '@/config/features';
import { DirectoryProvider } from '@/directory/DirectoryProvider';
import { MembershipProvider } from '@/membership/MembershipProvider';
import { ProgramProvider } from '@/program/ProgramProvider';
import { PlanProvider } from '@/plan/PlanProvider';
import { ThemeProvider, palette, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  // Every screen except sign-in lives behind the session. The tab and admin
  // layouts guard themselves too, but the modals (session, check-in, the
  // exercise guide…) are registered here at the root, and a guard on a sibling
  // does nothing for them: typing /edit-schedule into a browser used to open it
  // signed out. Protecting the group is what closes that for every screen at
  // once, including any added later.
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="session" options={{ presentation: 'modal' }} />
          <Stack.Screen name="check-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="learn/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="account" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="change-password" />
          {/* Off until billing exists; the flag hides the rows that link here,
              this closes the URL itself. */}
          <Stack.Protected guard={features.membership}>
            <Stack.Screen name="membership" />
          </Stack.Protected>
          <Stack.Screen name="admin" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.ink900 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <DirectoryProvider>
              <ProgramProvider>
                <PlanProvider>
                  <MembershipProvider>
                    <CheckInProvider>
                      <RootNavigator />
                    </CheckInProvider>
                  </MembershipProvider>
                </PlanProvider>
              </ProgramProvider>
            </DirectoryProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
