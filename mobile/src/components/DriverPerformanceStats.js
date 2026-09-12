import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getRideStats } from '../api/rideApi';
import { updateMe } from '../api/userApi';
import { formatFare } from '../utils/formatters';
import TextField from './TextField';
import PrimaryButton from './PrimaryButton';
import { radius, shadow, spacing } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

function formatRate(rate) {
  return rate == null ? '—' : `${Math.round(rate * 100)}%`;
}

export default function DriverPerformanceStats() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [stats, setStats] = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRideStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setGoalInput(data.weeklyRevenueGoal != null ? String(data.weeklyRevenueGoal) : '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  const handleSaveGoal = async () => {
    const parsed = Number(goalInput);
    if (!goalInput || Number.isNaN(parsed) || parsed < 0) return;
    setSavingGoal(true);
    try {
      await updateMe({ weeklyRevenueGoal: parsed });
      setStats((prev) => ({ ...prev, weeklyRevenueGoal: parsed }));
      setEditingGoal(false);
    } catch (err) {
      // Dashboard isn't a critical form - silently leave the edit row open so the user can retry.
    } finally {
      setSavingGoal(false);
    }
  };

  const progress = stats.weeklyRevenueGoal ? Math.min(1, stats.weeklyAmount / stats.weeklyRevenueGoal) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.amountsRow}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>{t('dashboard.today')}</Text>
          <Text style={styles.amountValue}>{formatFare(stats.dailyAmount)}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>{t('dashboard.thisWeek')}</Text>
          <Text style={styles.amountValue}>{formatFare(stats.weeklyAmount)}</Text>
        </View>
      </View>

      <View style={styles.goalSection}>
        {stats.weeklyRevenueGoal ? (
          <>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>{t('dashboard.weeklyGoal', { amount: formatFare(stats.weeklyRevenueGoal) })}</Text>
              <Pressable onPress={() => setEditingGoal((v) => !v)} hitSlop={8}>
                <Ionicons name="pencil" size={14} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </>
        ) : (
          <Pressable onPress={() => setEditingGoal(true)} style={styles.setGoalRow}>
            <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.setGoalText}>{t('dashboard.setGoal')}</Text>
          </Pressable>
        )}
        {editingGoal ? (
          <View style={styles.goalEditColumn}>
            <TextField placeholder={t('dashboard.goalPlaceholder')} value={goalInput} onChangeText={setGoalInput} keyboardType="numeric" />
            <PrimaryButton title={t('dashboard.save')} onPress={handleSaveGoal} loading={savingGoal} />
          </View>
        ) : null}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatRate(stats.acceptanceRate)}</Text>
          <Text style={styles.metricLabel}>{t('dashboard.acceptanceRate')}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatRate(stats.cancellationRate)}</Text>
          <Text style={styles.metricLabel}>{t('dashboard.cancellationRate')}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{stats.ratingCount > 0 ? `★ ${stats.ratingAverage.toFixed(1)}` : t('dashboard.noRatingYet')}</Text>
          <Text style={styles.metricLabel}>{t('dashboard.rating')}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  amountsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  amountBlock: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  goalSection: {
    gap: spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  setGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setGoalText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  goalEditColumn: {
    gap: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
