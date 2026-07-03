import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getRideStats } from '../api/rideApi';
import { formatFare } from '../utils/formatters';
import { ROLE } from '../config/constants';

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

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.value}>{stats.completedRides}</Text>
        <Text style={styles.label}>{t('dashboard.rides')}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.value}>{formatFare(stats.totalAmount)}</Text>
        <Text style={styles.label}>{t(role === ROLE.DRIVER ? 'dashboard.earned' : 'dashboard.spent')}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.value}>{stats.ridesThisMonth}</Text>
        <Text style={styles.label}>{t('dashboard.thisMonth')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    paddingVertical: 12,
  },
  stat: {
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a73e8',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
