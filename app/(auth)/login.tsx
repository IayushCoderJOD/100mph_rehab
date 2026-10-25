import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { LanguageSelect } from '@/components/common';
import { TextField } from '@/components/form';
import { features } from '@/config/features';
import { Button, Card, Logo, Screen, Text } from '@/components/ui';
import { mock } from '@/data';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
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
      {/* Before anything else on the screen: someone who reads Hindi should
          not have to get through an English sign-in to find the switch. */}
      <View style={styles.language}>
        <LanguageSelect />
      </View>

      <View style={styles.header}>
        <View style={styles.logo}>
          <Logo height={68} />
        </View>
        <View style={{ height: theme.spacing(6) }} />
        <Text variant="display">{t.login.welcome}</Text>
        <Text variant="subtitle" color="textSecondary" style={styles.subtitle}>
          {t.login.subtitle}
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label={t.login.email}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          autoFocus
        />
        <TextField
          label={t.login.password}
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
              {t.login.forgot}
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
        <Button label={t.login.logIn} onPress={handleSubmit} disabled={!valid} loading={loading} />
        <Text variant="caption" color="textMuted" align="center" style={styles.note}>
          {t.login.note}
          {features.forgotPassword ? '' : t.login.noteReset}
        </Text>
      </View>

      {__DEV__ ? (
        <Card variant="alt" style={styles.demo}>
          <Text variant="label" color="textSecondary" style={styles.demoLabel}>
            {t.login.demoTitle}
          </Text>
          {mock.demoLogins.map((demo) => (
            <Pressable
              key={demo.email}
              onPress={() => useDemo(demo.email, demo.password)}
              style={styles.demoRow}
              accessibilityRole="button"
              accessibilityLabel={t.login.demoFill(demo.role)}
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
  language: { alignItems: 'flex-end', paddingTop: 8 },
  header: { alignItems: 'flex-start', paddingTop: 8 },
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
