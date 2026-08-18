import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PageHeader } from '@/components/common';
import { Button, Card, Screen, Text } from '@/components/ui';
import { formatLongDate } from '@/data';
import { useMembership } from '@/membership/MembershipProvider';
import { useDismiss } from '@/navigation/useDismiss';
import { useTheme } from '@/theme';

export default function MembershipScreen() {
  const dismiss = useDismiss('/(tabs)/settings');
  const { theme } = useTheme();
  const { plan, plans, isActive, renewsOn, changePlan, cancelMembership, resumeMembership } =
    useMembership();

  const [selectedId, setSelectedId] = useState(plan.id);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const selected = plans.find((p) => p.id === selectedId) ?? plan;
  const isChanged = selectedId !== plan.id;

  return (
    <Screen scroll>
      <PageHeader
        title="Manage Membership"
        subtitle="Change how long you are signed up for, or cancel."
        onBack={dismiss}
      />

      <Card variant="alt" style={styles.current}>
        <View style={styles.currentHead}>
          <Text variant="label" color="textSecondary" style={styles.kicker}>
            Current Plan
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
              {isActive ? 'Active' : 'Cancelled'}
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
            ? `Renews on ${formatLongDate(renewsOn)}`
            : `Access ends on ${formatLongDate(renewsOn)}`}
        </Text>
      </Card>

      <Text variant="heading" style={styles.sectionTitle}>
        Change Duration
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.sectionNote}>
        Switching starts a fresh term from today.
      </Text>

      <View style={styles.options}>
        {plans.map((option) => {
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
                      · current
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
        label={isChanged ? `Switch to ${selected.name}` : 'Switch Plan'}
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
          {isActive ? 'Cancel Membership' : 'Membership Cancelled'}
        </Text>

        {isActive ? (
          <>
            <Text variant="caption" color="textSecondary" style={styles.dangerNote}>
              You keep full access until {formatLongDate(renewsOn)}. Your schedule and progress stay
              saved if you come back.
            </Text>

            {confirmingCancel ? (
              <View style={styles.confirm}>
                <Text variant="bodyStrong" color="danger">
                  Cancel your {plan.name.toLowerCase()} membership?
                </Text>
                <Button
                  label="Yes, Cancel Membership"
                  variant="secondary"
                  onPress={() => {
                    cancelMembership();
                    setConfirmingCancel(false);
                  }}
                  style={styles.confirmAction}
                />
                <Button
                  label="Keep My Membership"
                  variant="ghost"
                  onPress={() => setConfirmingCancel(false)}
                />
              </View>
            ) : (
              <Button
                label="Cancel Membership"
                variant="ghost"
                onPress={() => setConfirmingCancel(true)}
                style={styles.dangerAction}
              />
            )}
          </>
        ) : (
          <>
            <Text variant="caption" color="textSecondary" style={styles.dangerNote}>
              Your membership will not renew. Resume any time before{' '}
              {formatLongDate(renewsOn)} and nothing is lost.
            </Text>
            <Button label="Resume Membership" onPress={resumeMembership} style={styles.dangerAction} />
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
