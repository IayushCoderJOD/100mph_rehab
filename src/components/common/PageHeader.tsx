import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { IconButton } from './IconButton';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
};

/** Back arrow, title, optional action — for pushed screens under a hidden header. */
export function PageHeader({ title, subtitle, onBack, right }: PageHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {onBack ? (
          <IconButton name="chevron-back" variant="plain" onPress={onBack} style={styles.back} />
        ) : null}
        <View style={styles.spacer} />
        {right}
      </View>

      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="subtitle" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  // Pull the glyph back to the gutter so the arrow lines up with the title.
  back: { marginLeft: -12 },
  spacer: { flex: 1 },
  title: { marginTop: 10 },
  subtitle: { marginTop: 4 },
});
