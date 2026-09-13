import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getDemandZones } from '../api/rideApi';
import { radius, shadow, spacing } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

const POLL_INTERVAL_MS = 30000;
const MAX_ZONES_SHOWN = 5;

export default function DemandZones() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [zones, setZones] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getDemandZones()
        .then((data) => {
          if (!cancelled) setZones(data);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!zones) return null;

  const active = zones.filter((z) => z.count > 0).slice(0, MAX_ZONES_SHOWN);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('driver.demandZonesTitle')}</Text>
      {active.length === 0 ? (
        <Text style={styles.empty}>{t('driver.demandZonesEmpty')}</Text>
      ) : (
        active.map((zone) => (
          <View key={zone.name} style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="flame" size={14} color={colors.warning} />
              <Text style={styles.zoneName}>{zone.name}</Text>
            </View>
            <Text style={styles.zoneCount}>{t('driver.demandCount', { count: zone.count })}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  empty: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoneName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  zoneCount: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
