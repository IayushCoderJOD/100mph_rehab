import { Children, Fragment, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

type SettingsSectionProps = {
  label?: string;
  footnote?: string;
  children: ReactNode;
};

/** A titled group of rows, hairline-separated the way a settings list reads. */
export function SettingsSection({ label, footnote, children }: SettingsSectionProps) {
  const { theme } = useTheme();
  const rows = Children.toArray(children);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <Card style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            ) : null}
            {row}
          </Fragment>
        ))}
      </Card>

      {footnote ? (
        <Text variant="caption" color="textMuted" style={styles.footnote}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  label: { textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 },
  card: { paddingVertical: 4 },
  divider: { height: 1, marginLeft: 52 },
  footnote: { marginTop: 8, marginLeft: 4 },
});
