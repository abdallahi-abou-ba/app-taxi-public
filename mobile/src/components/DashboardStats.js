import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getRideStats } from '../api/rideApi';
import { formatFare } from '../utils/formatters';
import { ROLE } from '../config/constants';

export default function DashboardStats({ role }) {
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
        <Text style={styles.label}>Rides</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.value}>{formatFare(stats.totalAmount)}</Text>
        <Text style={styles.label}>{role === ROLE.DRIVER ? 'Earned' : 'Spent'}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.value}>{stats.ridesThisMonth}</Text>
        <Text style={styles.label}>This month</Text>
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
