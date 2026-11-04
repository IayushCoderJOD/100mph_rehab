import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ProfilePayload } from '@/api';
import { Button, Text } from '@/components/ui';
import { ISODate, User, ageFrom } from '@/data';
import { useI18n } from '@/i18n';
import { TextField } from '../form/TextField';

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

type ProfileFormProps = {
  /** Read once, when the form opens: a background reload must not stamp on what is being typed. */
  user: User;
  /** Whose details these are, which decides how the form talks about them. */
  subject: 'self' | 'client';
  /** A coach can correct the sign-in email; nobody changes their own without a mailer to confirm it. */
  editEmail?: boolean;
  /** Staff do not train here, so they have no age, height or weight to keep. */
  showBody?: boolean;
  footnote?: string;
  /** Resolves to the error to show, or null once saved. */
  onSave: (profile: ProfilePayload, email: string) => Promise<string | null>;
};

/**
 * The details of one person, for their own Edit Details screen and for the
 * coach's. It always saves the whole form, so clearing a field clears it.
 */
export function ProfileForm({ user, subject, editEmail = false, showBody = true, footnote, onSave }: ProfileFormProps) {
  const { t } = useI18n();

  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [dob, setDob] = useState(toDisplayDob(user.date_of_birth));
  const [height, setHeight] = useState(user.height_cm != null ? `${user.height_cm}` : '');
  const [weight, setWeight] = useState(user.weight_kg != null ? `${user.weight_kg}` : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A server's "that email is taken" is about what was sent, not what is typed now.
  useEffect(() => setError(null), [fullName, email, phone, dob, height, weight]);

  const nameTrimmed = fullName.trim();
  const emailTrimmed = email.trim();
  const phoneNormal = normalisePhone(phone);
  // Undefined for an empty field, null for one that does not parse.
  const dobIso = dob.trim() ? parseDob(dob) : undefined;
  const heightCm = height.trim() ? Number(height) : undefined;
  const weightKg = weight.trim() ? Number(weight) : undefined;

  const problems: string[] = [];
  if (nameTrimmed.length < 2) problems.push(t.editProfile.badName);
  if (editEmail && !/^\S+@\S+\.\S+$/.test(emailTrimmed)) problems.push(t.editProfile.badEmail);
  if (phoneNormal && !/^\+?[0-9]{7,15}$/.test(phoneNormal)) problems.push(t.editProfile.badPhone);
  if (dobIso === null) problems.push(t.editProfile.badDob);
  else if (dobIso && (ageFrom(dobIso) === null || dobIso >= new Date().toISOString().slice(0, 10)))
    problems.push(t.editProfile.futureDob);
  if (heightCm !== undefined && (!Number.isInteger(heightCm) || heightCm < 50 || heightCm > 272))
    problems.push(t.editProfile.badHeight);
  if (weightKg !== undefined && (Number.isNaN(weightKg) || weightKg < 2 || weightKg > 500))
    problems.push(t.editProfile.badWeight);

  const changed =
    nameTrimmed !== user.full_name ||
    (editEmail && emailTrimmed.toLowerCase() !== user.email) ||
    phoneNormal !== normalisePhone(user.phone ?? '') ||
    (dobIso ?? null) !== (user.date_of_birth ?? null) ||
    (heightCm ?? null) !== (user.height_cm ?? null) ||
    (weightKg ?? null) !== (user.weight_kg ?? null);
  const valid = problems.length === 0 && changed;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const failure = await onSave(
      {
        full_name: nameTrimmed,
        phone: phoneNormal,
        date_of_birth: dobIso ?? null,
        height_cm: heightCm ?? null,
        weight_kg: weightKg ?? null,
      },
      emailTrimmed
    );
    setSaving(false);
    setError(failure);
  };

  return (
    <>
      <View style={styles.form}>
        <TextField
          label={t.editProfile.fullName}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Rhea Menon"
          autoCapitalize="words"
          autoComplete={subject === 'self' ? 'name' : 'off'}
          maxLength={120}
        />
        {editEmail ? (
          <>
            <TextField
              label={t.editProfile.email}
              value={email}
              onChangeText={setEmail}
              placeholder="rhea@example.com"
              keyboardType="email-address"
              autoComplete="off"
            />
            <Text variant="caption" color="textMuted" style={styles.hint}>
              {t.editProfile.emailHint}
            </Text>
          </>
        ) : null}
        <TextField
          label={t.editProfile.phone}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          autoComplete={subject === 'self' ? 'tel' : 'off'}
          maxLength={20}
        />
        {showBody ? (
          <>
            <TextField
              label={t.editProfile.dob}
              value={dob}
              onChangeText={setDob}
              placeholder={t.editProfile.dobPlaceholder}
              keyboardType="numbers-and-punctuation"
            />
            {dobIso ? (
              <Text variant="caption" color="textMuted" style={styles.hint}>
                {(subject === 'self' ? t.editProfile.ageHint : t.editProfile.clientAgeHint)(ageFrom(dobIso))}
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
          </>
        ) : null}
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

      {footnote ? (
        <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
          {footnote}
        </Text>
      ) : null}
    </>
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
