import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RIDE_STATUS } from '../config/constants';
import { STATUS_COLORS, radius } from '../theme/theme';

const ICONS = {
  [RIDE_STATUS.SCHEDULED]: 'calendar',
  [RIDE_STATUS.REQUESTED]: 'time',
  [RIDE_STATUS.ACCEPTED]: 'navigate',
  [RIDE_STATUS.ARRIVED]: 'location',
  [RIDE_STATUS.IN_PROGRESS]: 'car-sport',
  [RIDE_STATUS.COMPLETED]: 'checkmark-circle',
  [RIDE_STATUS.CANCELLED]: 'close-circle',
};

export default function RideStatusBadge({ status }) {
  const { t } = useTranslation();
  const palette = STATUS_COLORS[status] || STATUS_COLORS.COMPLETED;

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Ionicons name={ICONS[status] || 'ellipse'} size={14} color={palette.fg} />
      <Text style={[styles.text, { color: palette.fg }]}>{t(`rideStatus.${status}`, status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  text: {
    fontWeight: '700',
    fontSize: 13,
  },
});
