import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useHover } from '@/hooks/useHover';
import { LANGUAGES, LANGUAGE_NAME, Language, useI18n } from '@/i18n';
import { useTheme } from '@/theme';
import { Text } from '../ui/Text';

const MENU_WIDTH = 180;
/** Room the menu needs below the pill before it would run off the bottom of the window. */
const MENU_HEIGHT = 110;

type Anchor = { top: number; right: number };

/**
 * The language dropdown: a pill with the language the app is in, and a short
 * menu under it to switch.
 *
 * The menu is drawn in a transparent Modal, measured against the pill, so it
 * floats over whatever is below on every platform. Drawn inline it would be
 * clipped by its parent on Android, and taps outside that parent never land.
 */
export function LanguageSelect() {
  const { theme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { hovered, hoverProps } = useHover();
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = () => {
    trigger.current?.measureInWindow((x, y, width, height) => {
      setAnchor({
        top: Math.min(y + height + 6, windowHeight - MENU_HEIGHT),
        right: Math.max(8, windowWidth - (x + width)),
      });
    });
  };

  const close = () => setAnchor(null);

  const choose = (next: Language) => {
    close();
    if (next !== language) setLanguage(next);
  };

  return (
    <>
      <Pressable
        ref={trigger}
        {...hoverProps}
        onPress={open}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${t.language.label}: ${LANGUAGE_NAME[language]}`}
        accessibilityHint={t.language.choose}
        accessibilityState={{ expanded: !!anchor }}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: hovered || anchor ? theme.colors.borderStrong : theme.colors.border,
            backgroundColor: hovered ? theme.colors.surfaceAlt : 'transparent',
            borderRadius: theme.radius.pill,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="language-outline" size={16} color={theme.colors.textSecondary} />
        <Text variant="label">{LANGUAGE_NAME[language]}</Text>
        <Ionicons name={anchor ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textMuted} />
      </Pressable>

      <Modal visible={!!anchor} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
        />
        {anchor ? (
          <View
            accessibilityRole="menu"
            accessibilityLabel={t.language.choose}
            style={[
              styles.menu,
              {
                top: anchor.top,
                right: anchor.right,
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            {LANGUAGES.map((option) => (
              <LanguageOption
                key={option}
                language={option}
                selected={option === language}
                onPress={() => choose(option)}
              />
            ))}
          </View>
        ) : null}
      </Modal>
    </>
  );
}

/** Its own component only so each row can hold its own hover state. */
function LanguageOption({
  language,
  selected,
  onPress,
}: {
  language: Language;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      // The option names itself in its own script; say which language that is.
      accessibilityLanguage={language}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.colors.accentSoft : hovered ? theme.colors.surfaceAlt : 'transparent',
          borderRadius: theme.radius.sm,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text variant="bodyStrong" color={selected ? 'textPrimary' : 'textSecondary'} style={styles.optionLabel}>
        {LANGUAGE_NAME[language]}
      </Text>
      {selected ? <Ionicons name="checkmark" size={18} color={theme.colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderWidth: 1,
    padding: 6,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionLabel: { flex: 1 },
});
