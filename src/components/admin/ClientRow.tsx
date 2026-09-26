import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { ClientSummary } from '@/api';
import { ISODate, parseISODate, todayISO } from '@/data';
import { useHover } from '@/hooks/useHover';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';
import { StatusBadge } from './StatusBadge';

type ClientRowProps = {
  summary: ClientSummary;
  onPress?: () => void;
};

export function daysSince(iso: ISODate | null, today: ISODate = todayISO()): number | null {
  if (!iso) return null;
  const ms = parseISODate(today).getTime() - parseISODate(iso).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * One client on the roster. Leads with the two numbers a coach actually scans
 * for — how much pain, and how long since they showed up — because a list that
 * only shows names makes you open every row to find the one that matters.
 * Every number here is the server's, so two coaches see the same list.
 */
export function ClientRow({ summary, onPress }: ClientRowProps) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();
  const { user: client } = summary;

  const quietDays = daysSince(summary.last_active_date);
  const silence =
    quietDays === null
      ? 'No activity yet'
      : summary.checked_in_today
        ? 'Checked in today'
        : quietDays === 0
          ? 'Active today'
          : `${quietDays}d since last activity`;

  const line = summary.has_plan
    ? `${summary.sessions_this_week} session${summary.sessions_this_week === 1 ? '' : 's'} this week` +
      (summary.adherence != null ? ` · ${Math.round(summary.adherence * 100)}% on plan` : '')
    : 'No week written yet';

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${client.full_name}, ${line}, ${silence}`}
      style={({ pressed }) => [
        styles.row,
        {
          // The roster is the screen a coach drives with a mouse most, so the
          // row under the pointer needs to be unambiguous.
          backgroundColor: hovered ? theme.colors.surfaceRaised : theme.colors.surface,
          borderColor: summary.needs_attention ? theme.colors.accentBorder : theme.colors.border,
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.score,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radius.sm,
          },
        ]}
      >
        <Text variant="bodyStrong">{summary.latest_pain_score ?? '—'}</Text>
        <Text variant="label" color="textMuted">
          PAIN
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {client.full_name}
          </Text>
          <StatusBadge status={client.status} />
        </View>
        <Text variant="caption" color={summary.has_plan ? 'textSecondary' : 'accentText'} numberOfLines={1}>
          {line}
        </Text>
        <Text
          variant="caption"
          color={summary.needs_attention ? 'accentText' : 'textMuted'}
          numberOfLines={1}
        >
          {silence}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    padding: 14,
  },
  score: {
    width: 46,
    height: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  body: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1 },
});
