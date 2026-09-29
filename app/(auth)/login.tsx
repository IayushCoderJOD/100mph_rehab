import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { TextField } from '@/components/form';
import { features } from '@/config/features';
import { Button, Card, Logo, Screen, Text } from '@/components/ui';
import { mock } from '@/data';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { signInWithPassword, error: authError, notice } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = email.includes('@') && password.length >= 4;

  const handleSubmit = async () => {
    if (!valid) return;

    setError(null);
    setLoading(true);
    const ok = await signInWithPassword(email, password);
    setLoading(false);

    if (!ok) {
      // The provider has already mapped the server's error code to copy, so a
      // suspended account and a wrong password read differently.
      setError(null);
      return;
    }
    router.replace('/(tabs)');
  };

  const useDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
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
          Sign in with the details your coach set up for you.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          autoFocus
        />
        <TextField
          label="PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secure
          autoComplete="password"
          autoCapitalize="none"
        />
        {features.forgotPassword ? (
          <Pressable hitSlop={8} style={styles.forgot}>
            <Text variant="bodyStrong" color="accentText">
              Forgot password?
            </Text>
          </Pressable>
        ) : null}
      </View>

      {notice && !(error ?? authError) ? (
        <Text variant="caption" color="accentText" style={styles.error}>
          {notice}
        </Text>
      ) : null}
      {error ?? authError ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error ?? authError}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Button label="Log In" onPress={handleSubmit} disabled={!valid} loading={loading} />
        <Text variant="caption" color="textMuted" align="center" style={styles.note}>
          Access is provisioned by your coach — there is no public sign-up.
          {features.forgotPassword ? '' : ' Forgotten your password? Your coach can reset it for you.'}
        </Text>
      </View>

      {__DEV__ ? (
        <Card variant="alt" style={styles.demo}>
          <Text variant="label" color="textSecondary" style={styles.demoLabel}>
            DEMO ACCOUNTS · DEV ONLY
          </Text>
          {mock.demoLogins.map((demo) => (
            <Pressable
              key={demo.email}
              onPress={() => useDemo(demo.email, demo.password)}
              style={styles.demoRow}
              accessibilityRole="button"
              accessibilityLabel={`Fill in the ${demo.role} demo account`}
            >
              <Text variant="caption" color="accentText">
                {demo.role}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {demo.email} · {demo.password}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', paddingTop: 16 },
  logo: { alignSelf: 'center' },
  subtitle: { marginTop: 10, maxWidth: '92%' },
  form: { marginTop: 32, gap: 18 },
  forgot: { alignSelf: 'flex-end' },
  error: { marginTop: 18 },
  footer: { marginTop: 40 },
  note: { marginTop: 16 },
  demo: { marginTop: 28, gap: 10 },
  demoLabel: { letterSpacing: 1.2 },
  demoRow: { gap: 2 },
});
