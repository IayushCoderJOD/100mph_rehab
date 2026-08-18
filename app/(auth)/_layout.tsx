import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { useProgram } from '@/program/ProgramProvider';
import { useTheme } from '@/theme';

export default function AuthLayout() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { hasSelected } = useProgram();

  // Signed in already: straight to the app, or to program selection if that
  // step was never finished.
  if (isAuthenticated) return <Redirect href={hasSelected ? '/(tabs)' : '/programs'} />;

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
