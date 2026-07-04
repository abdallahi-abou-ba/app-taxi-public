import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getRideStats } from '../api/rideApi';
import { formatFare } from '../utils/formatters';
import { ROLE } from '../config/constants';
import { colors, radius, shadow, spacing } from '../theme/theme';

export default function DashboardStats({ role }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getRideStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  const items = [
    { icon: 'car-sport', value: stats.completedRides, label: t('dashboard.rides') },
    { icon: 'wallet', value: formatFare(stats.totalAmount), label: t(role === ROLE.DRIVER ? 'dashboard.earned' : 'dashboard.spent'), highlight: true },
    { icon: 'calendar', value: stats.ridesThisMonth, label: t('dashboard.thisMonth') },
  ];

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.label} style={[styles.stat, item.highlight && styles.statHighlight]}>
          <View style={[styles.iconWrap, item.highlight && styles.iconWrapHighlight]}>
            <Ionicons name={item.icon} size={18} color={item.highlight ? colors.onPrimary : colors.charcoal} />
          </View>
          <Text style={[styles.value, item.highlight && styles.valueHighlight]}>{item.value}</Text>
          <Text style={[styles.label, item.highlight && styles.labelHighlight]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    gap: 6,
    ...shadow.card,
  },
  statHighlight: {
    backgroundColor: colors.charcoal,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapHighlight: {
    backgroundColor: colors.primary,
  },
  value: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  valueHighlight: {
    color: colors.textOnDark,
  },
  label: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  labelHighlight: {
    color: colors.textOnDarkMuted,
  },
});
