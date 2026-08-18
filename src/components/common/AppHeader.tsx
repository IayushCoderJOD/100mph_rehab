import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  center?: ReactNode;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, center, right }: AppHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {subtitle ? (
          <Text variant="label" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
      </View>

      {center ? <View style={styles.center}>{center}</View> : null}

      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  // Equal-weight flanks so the center slot lands on the screen's midline
  // no matter how long the name is.
  side: { flex: 1, gap: 2 },
  // Never let the brand mark push the name into wrapping.
  center: { paddingHorizontal: 12, flexShrink: 0 },
  right: { alignItems: 'flex-end' },
});
