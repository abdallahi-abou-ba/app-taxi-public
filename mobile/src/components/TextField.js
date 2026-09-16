import { useId, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, InputAccessoryView, Pressable, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, spacing } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

// iOS numeric-style keyboards have no return/done key of their own, so a
// field like a phone number can leave the keyboard covering the submit
// button below it with no way to dismiss it - hence the accessory bar.
const NUMERIC_KEYBOARD_TYPES = ['phone-pad', 'number-pad', 'decimal-pad', 'numeric'];

export default function TextField({ label, style, onFocus, onBlur, ...inputProps }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const accessoryId = useId();

  const needsDoneBar = Platform.OS === 'ios' && NUMERIC_KEYBOARD_TYPES.includes(inputProps.keyboardType);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, focused && styles.inputFocused, style]}
        placeholderTextColor={colors.textMuted}
        inputAccessoryViewID={needsDoneBar ? accessoryId : undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...inputProps}
      />
      {needsDoneBar ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.accessoryBar}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
              <Text style={styles.accessoryButtonText}>{t('common.done')}</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  accessoryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
