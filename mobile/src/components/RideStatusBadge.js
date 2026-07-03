import { View, Text, StyleSheet } from 'react-native';
import { RIDE_STATUS } from '../config/constants';

const LABELS = {
  [RIDE_STATUS.REQUESTED]: 'Looking for a driver',
  [RIDE_STATUS.ACCEPTED]: 'Driver on the way',
  [RIDE_STATUS.ARRIVED]: 'Driver has arrived',
  [RIDE_STATUS.IN_PROGRESS]: 'Trip in progress',
  [RIDE_STATUS.COMPLETED]: 'Trip completed',
  [RIDE_STATUS.CANCELLED]: 'Trip cancelled',
};

const COLORS = {
  [RIDE_STATUS.REQUESTED]: '#e8a33d',
  [RIDE_STATUS.ACCEPTED]: '#1a73e8',
  [RIDE_STATUS.ARRIVED]: '#1a73e8',
  [RIDE_STATUS.IN_PROGRESS]: '#1a8b53',
  [RIDE_STATUS.COMPLETED]: '#444',
  [RIDE_STATUS.CANCELLED]: '#d93025',
};

export default function RideStatusBadge({ status }) {
  return (
    <View style={[styles.badge, { backgroundColor: COLORS[status] || '#444' }]}>
      <Text style={styles.text}>{LABELS[status] || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
