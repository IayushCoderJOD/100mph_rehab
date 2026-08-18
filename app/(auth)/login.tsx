import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { PhoneField, TextField } from '@/components/form';
import { Button, Logo, Screen, SegmentedControl, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type Method = 'phone' | 'email';

const METHODS: { label: string; value: Method }[] = [
  { label: 'Phone', value: 'phone' },
  { label: 'Email', value: 'email' },
];

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { requestOtp, signInWithPassword } = useAuth();

  const [method, setMethod] = useState<Method>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneValid = phone.length >= 10;
  const emailValid = email.includes('@') && password.length >= 4;
  const valid = method === 'phone' ? phoneValid : emailValid;

  const handleSubmit = async () => {
    if (!valid) return;
    if (method === 'phone') {
      requestOtp(`+91 ${phone}`);
      router.push('/(auth)/verify');
      return;
    }
    setLoading(true);
    await signInWithPassword(email, password);
    router.replace('/programs');
  };

  return (
    <Screen keyboardAvoiding scroll>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Logo height={68} />
        </View>
        <View style={{ height: theme.spacing(6) }} />
        <Text variant="display">Welcome back</Text>
        <Text variant="subtitle" color="textSecondary" style={styles.subtitle}>
          Sign in to your program with the details your coach set up.
        </Text>
      </View>

      <View style={styles.toggle}>
        <SegmentedControl segments={METHODS} value={method} onChange={setMethod} />
      </View>

      <View style={styles.form}>
        {method === 'phone' ? (
          <>
            <Text variant="label" color="textSecondary" style={styles.fieldLabel}>
              PHONE NUMBER
            </Text>
            <PhoneField value={phone} onChangeText={setPhone} autoFocus />
          </>
        ) : (
          <View style={styles.emailForm}>
            <TextField
              label="EMAIL"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secure
              autoComplete="password"
            />
            <Pressable hitSlop={8} style={styles.forgot}>
              <Text variant="bodyStrong" color="accentText">
                Forgot password?
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label={method === 'phone' ? 'Continue' : 'Log In'}
          onPress={handleSubmit}
          disabled={!valid}
          loading={loading}
        />
        <Text variant="caption" color="textMuted" align="center" style={styles.note}>
          {method === 'phone'
            ? "We'll text you a one-time code to confirm it's you."
            : 'Access is provisioned by your coach — no public sign-up.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', paddingTop: 16 },
  logo: { alignSelf: 'center' },
  subtitle: { marginTop: 10, maxWidth: '92%' },
  toggle: { marginTop: 28 },
  form: { marginTop: 24 },
  fieldLabel: { marginBottom: 12 },
  emailForm: { gap: 18 },
  forgot: { alignSelf: 'flex-end' },
  footer: { marginTop: 40 },
  note: { marginTop: 16 },
});
