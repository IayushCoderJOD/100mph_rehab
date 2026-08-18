import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import { Text } from '../ui/Text';

type TextFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  autoFocus?: boolean;
  multiline?: boolean;
  /** Only read when multiline; the field grows from here. */
  minHeight?: number;
  maxLength?: number;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  autoFocus,
  multiline = false,
  minHeight = 110,
  maxLength,
}: TextFieldProps) {
  const { theme } = useTheme();
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          },
          multiline && { height: undefined, minHeight, alignItems: 'flex-start', paddingVertical: 14 },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: theme.colors.textPrimary },
            multiline && styles.multiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.eye}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  label: {},
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  input: { flex: 1, height: '100%', fontFamily: fontFamily.medium, fontSize: 16 },
  multiline: { height: 'auto', minHeight: 80, lineHeight: 22 },
  eye: { paddingLeft: 10 },
});
