import { Stack } from 'expo-router';
import { RequirePermission } from '@/access';
import { useTheme } from '@/theme';

/**
 * The back office. Guarded at the layout so every screen beneath it is
 * covered — including deep links and anything left on the back stack after a
 * role change. The server is still the real enforcement point.
 */
export default function AdminLayout() {
  const { theme } = useTheme();

  return (
    <RequirePermission permission="clients.view">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      />
    </RequirePermission>
  );
}
