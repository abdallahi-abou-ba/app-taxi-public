import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { requestRide, scheduleRide } from '../../api/rideApi';
import useActiveRide from '../../hooks/useActiveRide';
import useCurrentLocation from '../../hooks/useCurrentLocation';
import OsmMapView from '../../components/OsmMapView';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import { formatPaymentMethod, formatDateTime } from '../../utils/formatters';
import { RIDE_STATUS, MAP_DEFAULTS, PAYMENT_METHOD, MIN_SCHEDULE_LEAD_MIN, MAX_SCHEDULE_LEAD_DAYS } from '../../config/constants';

const BOOKING_MODE = { NOW: 'now', LATER: 'later' };

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
  const mapRef = useRef(null);

  const minDate = new Date(Date.now() + MIN_SCHEDULE_LEAD_MIN * 60 * 1000);
  const maxDate = new Date(Date.now() + MAX_SCHEDULE_LEAD_DAYS * 24 * 60 * 60 * 1000);

  // The map's initial center is baked in at mount time (see OsmMapView), so if
  // the GPS fix arrives after that first render, the view stays wherever the
  // fallback default was - recenter explicitly once we have a real fix.
  useEffect(() => {
    if (location && !pickup) {
      setPickup(location);
      mapRef.current?.centerOn(location.latitude, location.longitude, 15);
    }
  }, [location, pickup]);

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
        <ErrorBanner message={error || activeRideError} />
        {locationLoading && !pickup ? <Text style={styles.hint}>{t('client.gettingLocation')}</Text> : null}
        {locationError && !pickup ? <Text style={styles.hint}>{t('client.locationError', { error: locationError })}</Text> : null}
        {pickup && !destination ? <Text style={styles.hint}>{t('client.tapDestination')}</Text> : null}
        {pickup && destination ? <Text style={styles.hint}>{t('client.dragToFineTune')}</Text> : null}
        {pickup && destination ? (
          <>
            <View style={styles.paymentRow}>
              {[BOOKING_MODE.NOW, BOOKING_MODE.LATER].map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setBookingMode(mode)}
                  style={[styles.paymentOption, bookingMode === mode && styles.paymentOptionActive]}
                >
                  <Text style={[styles.paymentOptionText, bookingMode === mode && styles.paymentOptionTextActive]}>
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
              {[PAYMENT_METHOD.CASH, PAYMENT_METHOD.CARD].map((method) => (
                <Pressable
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionActive]}
                >
                  <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextActive]}>
                    {formatPaymentMethod(method, t)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton title={t('common.logout')} variant="secondary" onPress={logout} style={styles.smallButton} />
          <PrimaryButton
            title={t('common.profile')}
            variant="secondary"
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.smallButton}
          />
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            title={t('common.history')}
            variant="secondary"
            onPress={() => navigation.navigate('RideHistory')}
            style={styles.smallButton}
          />
          <PrimaryButton
            title={t('common.stats')}
            variant="secondary"
            onPress={() => navigation.navigate('Dashboard')}
            style={styles.smallButton}
          />
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            title={t('common.reservations')}
            variant="secondary"
            onPress={() => navigation.navigate('ScheduledRides')}
            style={styles.smallButton}
          />
          <PrimaryButton
            title={t('common.referral')}
            variant="secondary"
            onPress={() => navigation.navigate('Referral')}
            style={styles.smallButton}
          />
        </View>
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
  },
  panel: {
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 13,
    color: '#666',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentLabel: {
    fontSize: 13,
    color: '#666',
  },
  paymentOption: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  paymentOptionActive: {
    backgroundColor: '#1a73e8',
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
  },
  paymentOptionTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallButton: {
    flex: 1,
  },
});
