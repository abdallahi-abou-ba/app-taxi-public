import { Modal, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import RideSummaryCard from './RideSummaryCard';
import PrimaryButton from './PrimaryButton';
import { ROLE } from '../config/constants';

export default function IncomingRideModal({ ride, loading, onAccept, onDecline }) {
  const { t } = useTranslation();

  return (
    <Modal visible={!!ride} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('incomingRide.title')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
  },
});
