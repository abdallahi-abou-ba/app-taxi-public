import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/theme';

export default function QuickActionsGrid({ items }) {
  const basis = `${100 / items.length}%`;

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable key={item.key} onPress={item.onPress} style={[styles.item, { width: basis }]}>
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={20} color={colors.charcoal} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
