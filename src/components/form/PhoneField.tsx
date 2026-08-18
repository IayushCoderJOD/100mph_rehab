import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import { Text } from '../ui/Text';

type PhoneFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  countryCode?: string;
  autoFocus?: boolean;
};

export function PhoneField({
  value,
  onChangeText,
  countryCode = '+91',
  autoFocus,
}: PhoneFieldProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.inputBackground,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <View style={[styles.code, { borderRightColor: theme.colors.border }]}>
        <Text variant="heading" color="textPrimary">
          {countryCode}
        </Text>
      </View>
      <TextInput
        style={[styles.input, { color: theme.colors.textPrimary }]}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
        placeholder="00000 00000"
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="phone-pad"
        maxLength={12}
        autoFocus={autoFocus}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderWidth: 1,
    overflow: 'hidden',
  },
  code: {
    height: '100%',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 18,
    fontFamily: fontFamily.medium,
    fontSize: 18,
    letterSpacing: 1,
  },
});
