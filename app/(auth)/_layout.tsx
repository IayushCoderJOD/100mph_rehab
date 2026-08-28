import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { useTheme } from '@/theme';

export default function AuthLayout() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  // Signed in already: straight to the app. The program came with the account.
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
