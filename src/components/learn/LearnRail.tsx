import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type LearnRailProps = {
  title: string;
  caption?: string;
  children: ReactNode;
};

/**
 * A titled horizontal rail. Bleeds past the screen gutter so a scrolled row
 * runs to the edges instead of being clipped mid-padding.
 */
export function LearnRail({ title, caption, children }: LearnRailProps) {
  const { theme } = useTheme();
  const gutter = theme.spacing(5);

  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {caption ? (
        <Text variant="caption" color="textSecondary" style={styles.caption}>
          {caption}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.rail, { marginHorizontal: -gutter }]}
        contentContainerStyle={[styles.railContent, { paddingHorizontal: gutter }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 32 },
  caption: { marginTop: 3 },
  rail: { marginTop: 16 },
  railContent: { gap: 12 },
});
