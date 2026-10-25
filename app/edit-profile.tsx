import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { authApi, messageFor } from '@/api';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { Button, Screen, Text } from '@/components/ui';
import { ISODate, ageFrom } from '@/data';
import { useI18n } from '@/i18n';
import { useDismiss } from '@/navigation/useDismiss';

/** "14/03/1995" → "1995-03-14", or null when it is not a real date. */
function parseDob(input: string): ISODate | null {
  const match = input.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(iso + 'T00:00:00');
  if (Number.isNaN(date.getTime()) || date.getDate() !== Number(d) || date.getMonth() + 1 !== Number(m)) {
    return null;
  }
  return iso;
}

/** Digits and a leading +, the same normal form the server stores. */
function normalisePhone(input: string): string {
  return input.trim().replace(/[^+0-9]/g, '');
}

function toDisplayDob(iso: ISODate | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * The three numbers a physio wants before writing a week. Asked for here, in
 * the member's own hands, rather than typed by the coach across a desk: it is
 * their health data, and the app is the one place they can see and change it.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const dismiss = useDismiss('/(tabs)/settings');
  const { user, refresh } = useAuth();
  const { t } = useI18n();

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [dob, setDob] = useState(toDisplayDob(user?.date_of_birth ?? null));
  const [height, setHeight] = useState(user?.height_cm != null ? `${user.height_cm}` : '');
  const [weight, setWeight] = useState(user?.weight_kg != null ? `${user.weight_kg}` : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dobIso = dob.trim() ? parseDob(dob) : undefined;
  const heightCm = height.trim() ? Number(height) : undefined;
  const weightKg = weight.trim() ? Number(weight) : undefined;

  const phoneNormal = normalisePhone(phone);

  const problems: string[] = [];
  if (phoneNormal && !/^\+?[0-9]{7,15}$/.test(phoneNormal))
    problems.push(t.editProfile.badPhone);
  if (dobIso === null) problems.push(t.editProfile.badDob);
  else if (dobIso && (ageFrom(dobIso) === null || dobIso >= new Date().toISOString().slice(0, 10)))
    problems.push(t.editProfile.futureDob);
  if (heightCm !== undefined && (!Number.isInteger(heightCm) || heightCm < 50 || heightCm > 272))
    problems.push(t.editProfile.badHeight);
  if (weightKg !== undefined && (Number.isNaN(weightKg) || weightKg < 2 || weightKg > 500))
    problems.push(t.editProfile.badWeight);

  const phoneChanged = phoneNormal !== normalisePhone(user?.phone ?? '');
  const changed =
    phoneChanged ||
    (dobIso ?? null) !== (user?.date_of_birth ?? null) ||
    (heightCm ?? null) !== (user?.height_cm ?? null) ||
    (weightKg ?? null) !== (user?.weight_kg ?? null);
  const valid = problems.length === 0 && changed;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await authApi.updateMe({
        ...(phoneChanged ? { phone: phoneNormal } : {}),
        ...(dobIso ? { date_of_birth: dobIso } : {}),
        ...(heightCm !== undefined ? { height_cm: heightCm } : {}),
        ...(weightKg !== undefined ? { weight_kg: weightKg } : {}),
      });
      await refresh();
      dismiss();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title={t.editProfile.title}
        subtitle={t.editProfile.subtitle}
        onBack={() => router.back()}
      />

      <View style={styles.form}>
        <TextField
          label={t.editProfile.phone}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={20}
        />
        <TextField
          label={t.editProfile.dob}
          value={dob}
          onChangeText={setDob}
          placeholder={t.editProfile.dobPlaceholder}
          keyboardType="numbers-and-punctuation"
        />
        {dobIso ? (
          <Text variant="caption" color="textMuted" style={styles.hint}>
            {t.editProfile.ageHint(ageFrom(dobIso))}
          </Text>
        ) : null}
        <TextField
          label={t.editProfile.height}
          value={height}
          onChangeText={setHeight}
          placeholder="176"
          keyboardType="number-pad"
          maxLength={3}
        />
        <TextField
          label={t.editProfile.weight}
          value={weight}
          onChangeText={setWeight}
          placeholder="72.5"
          keyboardType="decimal-pad"
          maxLength={5}
        />
      </View>

      {problems.length > 0 ? (
        <View style={styles.problems}>
          {problems.map((problem) => (
            <Text key={problem} variant="caption" color="danger">
              {problem}
            </Text>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button label={t.editProfile.save} disabled={!valid} loading={saving} onPress={() => void save()} style={styles.save} />

      <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
        {t.editProfile.footnote}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 26, gap: 18 },
  hint: { marginTop: -10 },
  problems: { marginTop: 16, gap: 6 },
  error: { marginTop: 16 },
  save: { marginTop: 28 },
  footnote: { marginTop: 16 },
});
