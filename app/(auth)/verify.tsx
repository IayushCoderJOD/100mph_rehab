import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { OtpInput } from '@/components/form';
import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { pendingPhone, verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const valid = code.length === CODE_LENGTH;

  const handleVerify = async () => {
    if (!valid) return;
    setLoading(true);
    await verifyOtp(code);
    router.replace('/programs');
  };

  return (
    <Screen keyboardAvoiding>
      <View style={styles.container}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.back, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>

        <View style={styles.header}>
          <Text variant="display">Verify your number</Text>
          <Text variant="subtitle" color="textSecondary" style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text variant="subtitle" color="textPrimary">
              {pendingPhone ?? 'your phone'}
            </Text>
          </Text>
        </View>

        <View style={styles.form}>
          <OtpInput value={code} onChangeText={setCode} length={CODE_LENGTH} onComplete={handleVerify} />
          <Pressable style={styles.resend} onPress={() => setCode('')} hitSlop={8}>
            <Text variant="bodyStrong" color="accentText">
              Resend code
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Button label="Verify & Continue" onPress={handleVerify} disabled={!valid} loading={loading} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  header: { alignItems: 'flex-start' },
  subtitle: { marginTop: 10 },
  form: { marginTop: 40 },
  resend: { marginTop: 24, alignSelf: 'flex-start' },
  footer: { marginTop: 'auto', paddingBottom: 12 },
});
