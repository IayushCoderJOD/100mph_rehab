import { useTheme } from '@/theme';
import { IconButton } from './IconButton';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <IconButton
      name={isDark ? 'sunny-outline' : 'moon-outline'}
      onPress={toggleTheme}
      variant="outline"
    />
  );
}
