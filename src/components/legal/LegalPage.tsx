import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { PageHeader } from '@/components/common';
import { Screen, Text } from '@/components/ui';

export type LegalSection = { heading: string; body: string[] };

type LegalPageProps = {
  title: string;
  subtitle?: string;
  intro: string;
  sections: LegalSection[];
  children?: ReactNode;
};

/**
 * A public, readable page of headed paragraphs — the privacy policy and the
 * account-deletion instructions. These sit outside the signed-in guard on
 * purpose: the app stores link to them, and a reviewer or a former member has
 * to be able to read them without an account.
 */
export function LegalPage({ title, subtitle, intro, sections, children }: LegalPageProps) {
  const router = useRouter();

  // Opened from a link there is no history to go back to, so fall back to the
  // front door — sign-in or Home, whichever the session allows.
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen scroll>
      <PageHeader title={title} subtitle={subtitle} onBack={back} />

      <Text variant="body" color="textSecondary" style={styles.intro}>
        {intro}
      </Text>

      {sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {section.heading}
          </Text>
          {section.body.map((line) => (
            <Text key={line} variant="body" color="textSecondary" style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      ))}

      {children ? <View style={styles.footer}>{children}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 20, lineHeight: 24 },
  section: { marginTop: 28, gap: 8 },
  line: { lineHeight: 24 },
  footer: { marginTop: 32, gap: 12, paddingBottom: 24 },
});
