import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Logo } from '@/components/ui';
import { Text } from '@/components/ui/Text';
import { useHover } from '@/hooks/useHover';
import { useTheme } from '@/theme';

/** How much horizontal room the rail takes out of the window. */
export const SIDE_RAIL_WIDTH = 232;

/** The tab bar's routes carry icons but no labels — a rail has room for both. */
const LABEL: Record<string, string> = {
  index: 'Home',
  clients: 'Clients',
  plan: 'Plan',
  progress: 'Progress',
  learn: 'Learn',
  settings: 'Settings',
};

/**
 * Only the parts of the navigator's tab-bar props this rail actually reads.
 *
 * react-navigation's own `BottomTabBarProps` is not reachable: expo-router
 * vendors bottom-tabs inside its build output rather than depending on the
 * published package, so the only import path is through `build/`, which is
 * private and free to move between patch releases. Describing the shape we
 * use is both stable and a clearer statement of what this component needs.
 */
type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string; params?: object }[];
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
        tabBarItemStyle?: StyleProp<ViewStyle>;
      };
    }
  >;
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

/**
 * The tab bar, as a desktop window wants it.
 *
 * A bar pinned to the bottom edge of a 1400px monitor is a phone idiom with
 * nothing holding it up: the targets sit marooned in the middle of a very wide
 * strip, a mouse-journey away from the content they act on. The same
 * destinations down the left read as navigation instead, and there is room to
 * put the labels back — which is why the phone bar hides them and this one
 * does not.
 *
 * Rendered through the navigator's own `tabBar` slot, so routing, focus order
 * and accessibility stay entirely react-navigation's business.
 */
export function SideRail({ state, descriptors, navigation }: TabBarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.rail,
        { backgroundColor: theme.colors.background, borderRightColor: theme.colors.border },
      ]}
    >
      <View style={styles.brand}>
        <Logo height={30} />
      </View>

      <View style={styles.items}>
        {state.routes.map((route, index) => {
          // A tab removed with `href: null` — a physio has no training plan,
          // a member has no client roster — stays in the navigator's state and
          // is hidden by the bar rather than dropped. The default bar reads
          // that off `tabBarItemStyle`, and so must this one, or the rail shows
          // destinations the signed-in role is not allowed to open. The same
          // marker also hides expo-router's generated screens, like _sitemap.
          const options = descriptors[route.key]?.options;
          if (StyleSheet.flatten(options?.tabBarItemStyle)?.display === 'none') return null;

          return (
            <RailItem
              key={route.key}
              label={options?.title ?? LABEL[route.name] ?? route.name}
              icon={options?.tabBarIcon}
              focused={state.index === index}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (state.index !== index && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

type RailItemProps = {
  label: string;
  icon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
  focused: boolean;
  onPress: () => void;
};

function RailItem({ label, icon, focused, onPress }: RailItemProps) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();

  const color = focused ? theme.colors.textPrimary : theme.colors.tabInactive;

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.item,
        {
          borderRadius: theme.radius.md,
          backgroundColor: focused
            ? theme.colors.accentSoft
            : hovered
              ? theme.colors.surface
              : 'transparent',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {icon?.({ focused, color, size: 22 })}
      <Text variant="bodyStrong" color={focused ? 'textPrimary' : 'tabInactive'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDE_RAIL_WIDTH,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  brand: { paddingLeft: 12, paddingBottom: 28 },
  items: { gap: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
