import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { requestRide, scheduleRide, estimateRide } from '../../api/rideApi';
import useActiveRide from '../../hooks/useActiveRide';
import useCurrentLocation from '../../hooks/useCurrentLocation';
import OsmMapView from '../../components/OsmMapView';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import QuickActionsGrid from '../../components/QuickActionsGrid';
import { formatPaymentMethod, formatDateTime, formatDistance, formatDuration, formatFare } from '../../utils/formatters';
import { RIDE_STATUS, MAP_DEFAULTS, PAYMENT_METHOD, CLIENT_PAYMENT_METHODS, MIN_SCHEDULE_LEAD_MIN, MAX_SCHEDULE_LEAD_DAYS } from '../../config/constants';
import { colors, radius, shadow, spacing } from '../../theme/theme';

const BOOKING_MODE = { NOW: 'now', LATER: 'later' };

const PAYMENT_ICONS = {
  [PAYMENT_METHOD.CASH]: 'cash-outline',
  [PAYMENT_METHOD.CARD]: 'card-outline',
  [PAYMENT_METHOD.BANKILY]: 'phone-portrait-outline',
  [PAYMENT_METHOD.SEDAD]: 'phone-portrait-outline',
  [PAYMENT_METHOD.MASRIVI]: 'phone-portrait-outline',
  [PAYMENT_METHOD.CLICK]: 'phone-portrait-outline',
  [PAYMENT_METHOD.BIMBANK]: 'phone-portrait-outline',
};

export default function ClientHomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { activeRide, loading: activeRideLoading, error: activeRideError } = useActiveRide();
  const { location, error: locationError, loading: locationLoading } = useCurrentLocation();

  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.CASH);
  const [bookingMode, setBookingMode] = useState(BOOKING_MODE.NOW);
  const [scheduledDate, setScheduledDate] = useState(null);
  const [pendingDate, setPendingDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const mapRef = useRef(null);

  const minDate = new Date(Date.now() + MIN_SCHEDULE_LEAD_MIN * 60 * 1000);
  const maxDate = new Date(Date.now() + MAX_SCHEDULE_LEAD_DAYS * 24 * 60 * 60 * 1000);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={logout} hitSlop={10} style={styles.headerButton}>
          <Ionicons name="log-out-outline" size={22} color={colors.textOnDark} />
        </Pressable>
      ),
    });
  }, [navigation, logout]);

  // The map's initial center is baked in at mount time (see OsmMapView), so if
  // the GPS fix arrives after that first render, the view stays wherever the
  // fallback default was - recenter explicitly once we have a real fix.
  useEffect(() => {
    if (location && !pickup) {
      setPickup(location);
      mapRef.current?.centerOn(location.latitude, location.longitude, 15);
    }
  }, [location, pickup]);

  // Debounced so a marker drag (many rapid position updates) doesn't spam the
  // estimate endpoint - only the position 500ms after the user stops matters.
  useEffect(() => {
    if (!pickup || !destination) {
      setEstimate(null);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await estimateRide({
          pickupLat: pickup.latitude,
          pickupLng: pickup.longitude,
          destinationLat: destination.latitude,
          destinationLng: destination.longitude,
        });
        setEstimate(result);
      } catch (err) {
        // Silent failure - this is just a preview, the server recomputes the
        // authoritative figures when the ride is actually requested.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pickup, destination]);

  // Resume an in-flight ride if one exists (e.g. the app was restarted mid-ride).
  useEffect(() => {
    if (!activeRide) return;
    if (activeRide.status === RIDE_STATUS.REQUESTED) {
      navigation.replace('WaitingForDriver', { rideId: activeRide.id, ride: activeRide });
    } else {
      navigation.replace('ActiveRide', { rideId: activeRide.id, ride: activeRide });
    }
  }, [activeRide, navigation]);

  const handleRequestRide = async () => {
    if (!pickup || !destination) return;
    setError(null);
    setRequesting(true);
    try {
      const ride = await requestRide({
        pickupLat: pickup.latitude,
        pickupLng: pickup.longitude,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        paymentMethod,
      });
      navigation.replace('WaitingForDriver', { rideId: ride.id, ride });
    } catch (err) {
      setError(err.message || t('client.requestError'));
      setRequesting(false);
    }
  };

  const handleScheduleRide = async () => {
    if (!pickup || !destination || !scheduledDate) return;
    setError(null);
    setRequesting(true);
    try {
      await scheduleRide({
        pickupLat: pickup.latitude,
        pickupLng: pickup.longitude,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        paymentMethod,
        scheduledFor: scheduledDate.toISOString(),
      });
      navigation.navigate('ScheduledRides');
    } catch (err) {
      setError(err.message || t('client.scheduleError'));
    } finally {
      setRequesting(false);
    }
  };

  const handleDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setPendingDate(selected);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selected) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selected || !pendingDate) return;
    const combined = new Date(pendingDate);
    combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setScheduledDate(combined);
  };

  if (activeRideLoading) {
    return <LoadingOverlay message={t('splash.loading')} />;
  }

  const initialRegion = pickup ? { ...pickup, zoom: 15 } : MAP_DEFAULTS;
  const markers = [
    ...(pickup ? [{ id: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, label: t('map.pickup'), draggable: true }] : []),
    ...(destination
      ? [{ id: 'destination', latitude: destination.latitude, longitude: destination.longitude, label: t('map.destination'), draggable: true }]
      : []),
  ];

  const canSubmit = pickup && destination && (bookingMode === BOOKING_MODE.NOW || scheduledDate);

  const quickActions = [
    { key: 'profile', icon: 'person-outline', label: t('common.profile'), onPress: () => navigation.navigate('EditProfile') },
    { key: 'history', icon: 'time-outline', label: t('common.history'), onPress: () => navigation.navigate('RideHistory') },
    { key: 'stats', icon: 'stats-chart-outline', label: t('common.stats'), onPress: () => navigation.navigate('Dashboard') },
    { key: 'reservations', icon: 'calendar-outline', label: t('common.reservations'), onPress: () => navigation.navigate('ScheduledRides') },
    { key: 'referral', icon: 'gift-outline', label: t('common.referral'), onPress: () => navigation.navigate('Referral') },
    { key: 'recharge', icon: 'wallet-outline', label: t('common.recharge'), onPress: () => navigation.navigate('Recharge') },
  ];

  return (
    <View style={styles.container}>
      <OsmMapView
        ref={mapRef}
        initialRegion={initialRegion}
        markers={markers}
        onMapPress={(lat, lng) => {
          // No GPS pickup yet (permission denied, no fix, ...)? First tap sets
          // pickup manually instead of leaving the user stuck with a disabled button.
          if (!pickup) {
            setPickup({ latitude: lat, longitude: lng });
          } else {
            setDestination({ latitude: lat, longitude: lng });
          }
        }}
        onMarkerDragEnd={(id, lat, lng) => {
          if (id === 'pickup') setPickup({ latitude: lat, longitude: lng });
          if (id === 'destination') setDestination({ latitude: lat, longitude: lng });
        }}
      />

      <View style={styles.panel}>
        <View style={styles.handle} />
        <ErrorBanner message={error || activeRideError} />
        {locationLoading && !pickup ? <Text style={styles.hint}>{t('client.gettingLocation')}</Text> : null}
        {locationError && !pickup ? <Text style={styles.hint}>{t('client.locationError', { error: locationError })}</Text> : null}
        {pickup && !destination ? <Text style={styles.hint}>{t('client.tapDestination')}</Text> : null}
        {pickup && destination ? <Text style={styles.hint}>{t('client.dragToFineTune')}</Text> : null}
        {pickup && destination ? (
          <>
            {estimate ? (
              <View style={styles.estimateRow}>
                <View style={styles.estimateChip}>
                  <Ionicons name="trail-sign-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.estimateText}>{formatDistance(estimate.distanceKm)}</Text>
                </View>
                <View style={styles.estimateChip}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.estimateText}>{formatDuration(estimate.durationMin)}</Text>
                </View>
                <View style={[styles.estimateChip, styles.estimateFareChip]}>
                  <Ionicons name="pricetag" size={13} color={colors.onPrimary} />
                  <Text style={styles.estimateFareText}>{formatFare(estimate.estimatedFare)}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.segmentRow}>
              {[BOOKING_MODE.NOW, BOOKING_MODE.LATER].map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setBookingMode(mode)}
                  style={[styles.segment, bookingMode === mode && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, bookingMode === mode && styles.segmentTextActive]}>
                    {t(mode === BOOKING_MODE.NOW ? 'client.bookNow' : 'client.bookLater')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {bookingMode === BOOKING_MODE.LATER ? (
              <PrimaryButton
                title={scheduledDate ? t('client.scheduledFor', { date: formatDateTime(scheduledDate.toISOString(), i18n.language) }) : t('client.chooseDateTime')}
                variant="secondary"
                onPress={() => setShowDatePicker(true)}
              />
            ) : null}
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>{t('payment.payWith')}</Text>
              <View style={styles.paymentOptions}>
                {CLIENT_PAYMENT_METHODS.map((method) => (
                  <Pressable
                    key={method}
                    onPress={() => setPaymentMethod(method)}
                    style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionActive]}
                  >
                    <Ionicons
                      name={PAYMENT_ICONS[method]}
                      size={14}
                      color={paymentMethod === method ? colors.onPrimary : colors.textSecondary}
                    />
                    <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextActive]}>
                      {formatPaymentMethod(method, t)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : null}

        <QuickActionsGrid items={quickActions} />

        <PrimaryButton
          title={bookingMode === BOOKING_MODE.NOW ? t('client.requestRide') : t('client.scheduleRide')}
          onPress={bookingMode === BOOKING_MODE.NOW ? handleRequestRide : handleScheduleRide}
          disabled={!canSubmit}
          loading={requesting}
        />
      </View>

      {showDatePicker ? (
        <DateTimePicker value={scheduledDate || minDate} mode="date" minimumDate={minDate} maximumDate={maxDate} onChange={handleDateChange} />
      ) : null}
      {showTimePicker ? <DateTimePicker value={scheduledDate || minDate} mode="time" onChange={handleTimeChange} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    paddingHorizontal: 4,
  },
  panel: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 2,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  estimateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  estimateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  estimateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  estimateFareChip: {
    backgroundColor: colors.primary,
  },
  estimateFareText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.charcoal,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textOnDark,
  },
  paymentRow: {
    gap: 8,
  },
  paymentLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  paymentOptionActive: {
    backgroundColor: colors.primary,
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentOptionTextActive: {
    color: colors.onPrimary,
  },
});
