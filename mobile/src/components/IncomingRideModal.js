import { Modal, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import RideSummaryCard from './RideSummaryCard';
import PrimaryButton from './PrimaryButton';
import { ROLE } from '../config/constants';
import { colors, radius, shadow, spacing } from '../theme/theme';

export default function IncomingRideModal({ ride, loading, onAccept, onDecline }) {
  const { t } = useTranslation();

  return (
    <Modal visible={!!ride} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Ionicons name="car-sport" size={18} color={colors.onPrimary} />
            </View>
            <Text style={styles.title}>{t('incomingRide.title')}</Text>
          </View>
          {ride ? <RideSummaryCard ride={ride} viewerRole={ROLE.DRIVER} /> : null}
          <View style={styles.actions}>
            <PrimaryButton title={t('incomingRide.decline')} variant="secondary" onPress={onDecline} style={styles.button} disabled={loading} />
            <PrimaryButton title={t('incomingRide.accept')} onPress={onAccept} style={styles.button} loading={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,28,30,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadow.raised,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
