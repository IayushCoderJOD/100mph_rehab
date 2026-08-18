import { StyleSheet, View } from 'react-native';
import { HeartBadge, Screen, Text } from '@/components/ui';

export function ComingSoon({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Screen>
      <View style={styles.center}>
        <HeartBadge size={72} />
        <Text variant="title" style={styles.title}>
          {title}
        </Text>
        <Text variant="subtitle" color="textSecondary" align="center">
          {subtitle}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { marginTop: 20 },
});
