import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadow, spacing } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

export default function MoreMenuList({ items }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable key={item.key} onPress={item.onPress} style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={20} color={colors.charcoal} />
          </View>
          <Text style={styles.label}>{item.label}</Text>
          {item.showChevron === false ? null : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
