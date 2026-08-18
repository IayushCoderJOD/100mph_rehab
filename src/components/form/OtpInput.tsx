import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

type OtpInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
};

export function OtpInput({
  value,
  onChangeText,
  length = 6,
  autoFocus = true,
  onComplete,
}: OtpInputProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  const cells = Array.from({ length });
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable style={styles.wrap} onPress={() => inputRef.current?.focus()}>
      {cells.map((_, i) => {
        const filled = i < value.length;
        const isActive = focused && i === activeIndex;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.inputBackground,
                borderColor: isActive
                  ? theme.colors.accent
                  : filled
                    ? theme.colors.borderStrong
                    : theme.colors.border,
              },
            ]}
          >
            <Text variant="title" color="textPrimary">
              {value[i] ?? ''}
            </Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cell: {
    flex: 1,
    height: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
