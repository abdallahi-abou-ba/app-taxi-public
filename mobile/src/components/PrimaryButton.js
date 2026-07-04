import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/theme';

export default function PrimaryButton({ title, onPress, disabled, loading, variant = 'primary', style }) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'primary' ? colors.charcoal : variant === 'danger' ? colors.surface : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.text, variant === 'secondary' && styles.textSecondary, variant === 'danger' && styles.textDanger]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
  },
  danger: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  disabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  text: {
    color: colors.charcoal,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSecondary: {
    color: colors.textPrimary,
  },
  textDanger: {
    color: colors.surface,
  },
});
