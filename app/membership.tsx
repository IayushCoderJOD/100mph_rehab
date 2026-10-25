import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PageHeader } from '@/components/common';
import { Button, Card, Screen, Text } from '@/components/ui';
import { formatLongDate } from '@/data';
import { useI18n } from '@/i18n';
import { useMembership } from '@/membership/MembershipProvider';
import { useDismiss } from '@/navigation/useDismiss';
import { useTheme } from '@/theme';

export default function MembershipScreen() {
  const dismiss = useDismiss('/(tabs)/settings');
  const { theme } = useTheme();
  const { plan: storedPlan, plans, isActive, renewsOn, changePlan, cancelMembership, resumeMembership } =
    useMembership();
  const { t, localize } = useI18n();
  const plan = localize.plan(storedPlan);

  const [selectedId, setSelectedId] = useState(plan.id);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const selected = localize.plan(plans.find((p) => p.id === selectedId) ?? storedPlan);
  const isChanged = selectedId !== plan.id;

  return (
    <Screen scroll>
      <PageHeader
        title={t.membership.title}
        subtitle={t.membership.subtitle}
        onBack={dismiss}
      />

      <Card variant="alt" style={styles.current}>
        <View style={styles.currentHead}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            {t.membership.currentPlan}
          </Text>
          <View
            style={[
              styles.badge,
              {
                borderColor: isActive ? theme.colors.accentBorder : theme.colors.danger,
                backgroundColor: isActive ? theme.colors.accentSoft : 'transparent',
                borderRadius: theme.radius.pill,
              },
            ]}
          >
            <Text variant="caption" color={isActive ? 'accentText' : 'danger'}>
              {isActive ? t.membership.active : t.membership.cancelled}
            </Text>
          </View>
        </View>

        <Text variant="title" style={styles.currentName}>
          {plan.name}
        </Text>
        <Text variant="caption" color="textSecondary">
          {plan.price_label}
        </Text>
        <Text variant="caption" color={isActive ? 'textSecondary' : 'danger'} style={styles.renewal}>
          {isActive
            ? t.membership.renewsOn(formatLongDate(renewsOn))
            : t.membership.endsOn(formatLongDate(renewsOn))}
        </Text>
      </Card>

      <Text variant="heading" style={styles.sectionTitle}>
        {t.membership.changeDuration}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.sectionNote}>
        {t.membership.changeNote}
      </Text>

      <View style={styles.options}>
        {plans.map(localize.plan).map((option) => {
          const active = option.id === selectedId;
          const current = option.id === plan.id;

          return (
            <Pressable
              key={option.id}
              onPress={() => setSelectedId(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: active ? theme.colors.accentSoft : theme.colors.surface,
                  borderColor: active ? theme.colors.accentBorder : theme.colors.border,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
                    backgroundColor: active ? theme.colors.accent : 'transparent',
                  },
                ]}
              >
                {active ? (
                  <Ionicons name="checkmark-sharp" size={13} color={theme.colors.onAccent} />
                ) : null}
              </View>

              <View style={styles.optionBody}>
                <View style={styles.optionHead}>
                  <Text variant="bodyStrong">{option.name}</Text>
                  {current ? (
                    <Text variant="caption" color="textMuted">
                      {t.membership.current}
                    </Text>
                  ) : null}
                </View>
                <Text variant="caption" color="textSecondary">
                  {option.description}
                </Text>
              </View>

              <Text variant="caption" color={active ? 'accentText' : 'textSecondary'}>
                {option.price_label.split(' / ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        label={isChanged ? t.membership.switchTo(selected.name) : t.membership.switchPlan}
        disabled={!isChanged}
        onPress={() => changePlan(selectedId)}
        style={styles.switchButton}
      />

      <View
        style={[
          styles.danger,
          { borderColor: theme.colors.danger, borderRadius: theme.radius.lg },
        ]}
      >
        <Text variant="heading" color="danger">
          {isActive ? t.membership.cancelTitle : t.membership.cancelledTitle}
        </Text>

        {isActive ? (
          <>
            <Text variant="caption" color="textSecondary" style={styles.dangerNote}>
              {t.membership.keepAccess(formatLongDate(renewsOn))}
            </Text>

            {confirmingCancel ? (
              <View style={styles.confirm}>
                <Text variant="bodyStrong" color="danger">
                  {t.membership.confirmCancel(plan.name)}
                </Text>
                <Button
                  label={t.membership.yesCancel}
                  variant="secondary"
                  onPress={() => {
                    cancelMembership();
                    setConfirmingCancel(false);
                  }}
                  style={styles.confirmAction}
                />
                <Button
                  label={t.membership.keepMembership}
                  variant="ghost"
                  onPress={() => setConfirmingCancel(false)}
                />
              </View>
            ) : (
              <Button
                label={t.membership.cancel}
                variant="ghost"
                onPress={() => setConfirmingCancel(true)}
                style={styles.dangerAction}
              />
            )}
          </>
        ) : (
          <>
            <Text variant="caption" color="textSecondary" style={styles.dangerNote}>
              {t.membership.willNotRenew(formatLongDate(renewsOn))}
            </Text>
            <Button label={t.membership.resume} onPress={resumeMembership} style={styles.dangerAction} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { marginTop: 24 },
  currentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2 },
  badge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  currentName: { marginTop: 10 },
  renewal: { marginTop: 10 },
  sectionTitle: { marginTop: 32 },
  sectionNote: { marginTop: 4 },
  options: { gap: 10, marginTop: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    padding: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: { flex: 1, gap: 2 },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  switchButton: { marginTop: 18 },
  danger: { borderWidth: 1, padding: 20, marginTop: 36 },
  dangerNote: { marginTop: 8, lineHeight: 18 },
  dangerAction: { marginTop: 16 },
  confirm: { marginTop: 18, gap: 10 },
  confirmAction: { marginTop: 4 },
});
