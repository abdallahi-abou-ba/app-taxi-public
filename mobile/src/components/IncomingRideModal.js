import { Modal, View, Text, StyleSheet } from 'react-native';
import RideSummaryCard from './RideSummaryCard';
import PrimaryButton from './PrimaryButton';
import { ROLE } from '../config/constants';

export default function IncomingRideModal({ ride, loading, onAccept, onDecline }) {
  return (
    <Modal visible={!!ride} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>New ride request</Text>
          {ride ? <RideSummaryCard ride={ride} viewerRole={ROLE.DRIVER} /> : null}
          <View style={styles.actions}>
            <PrimaryButton title="Decline" variant="secondary" onPress={onDecline} style={styles.button} disabled={loading} />
            <PrimaryButton title="Accept" onPress={onAccept} style={styles.button} loading={loading} />
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
