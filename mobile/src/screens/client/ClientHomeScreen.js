import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { requestRide } from '../../api/rideApi';
import useActiveRide from '../../hooks/useActiveRide';
import useCurrentLocation from '../../hooks/useCurrentLocation';
import OsmMapView from '../../components/OsmMapView';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import { RIDE_STATUS, MAP_DEFAULTS, PAYMENT_METHOD } from '../../config/constants';

export default function ClientHomeScreen({ navigation }) {
  const { logout } = useAuth();
  const { activeRide, loading: activeRideLoading, error: activeRideError } = useActiveRide();
  const { location, error: locationError, loading: locationLoading } = useCurrentLocation();

  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.CASH);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

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
      setError(err.message || 'Could not request a ride');
      setRequesting(false);
    }
  };

  if (activeRideLoading) {
    return <LoadingOverlay message="Loading..." />;
  }

  const initialRegion = pickup ? { ...pickup, zoom: 15 } : MAP_DEFAULTS;
  const markers = [
    ...(pickup ? [{ id: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, label: 'Pickup', draggable: true }] : []),
    ...(destination
      ? [{ id: 'destination', latitude: destination.latitude, longitude: destination.longitude, label: 'Destination', draggable: true }]
      : []),
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
        <ErrorBanner message={error || activeRideError} />
        {locationLoading && !pickup ? <Text style={styles.hint}>Getting your location...</Text> : null}
        {locationError && !pickup ? <Text style={styles.hint}>Couldn't get your location ({locationError}) - tap the map to set your pickup point.</Text> : null}
        {pickup && !destination ? <Text style={styles.hint}>Tap the map to drop your destination</Text> : null}
        {pickup && destination ? <Text style={styles.hint}>Drag the pins to fine-tune, then request</Text> : null}
        {pickup && destination ? (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Pay with:</Text>
            {[PAYMENT_METHOD.CASH, PAYMENT_METHOD.CARD].map((method) => (
              <Pressable
                key={method}
                onPress={() => setPaymentMethod(method)}
                style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionActive]}
              >
                <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextActive]}>
                  {method === PAYMENT_METHOD.CARD ? 'Card' : 'Cash'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton title="Log out" variant="secondary" onPress={logout} style={styles.smallButton} />
          <PrimaryButton title="Profile" variant="secondary" onPress={() => navigation.navigate('EditProfile')} style={styles.smallButton} />
          <PrimaryButton title="History" variant="secondary" onPress={() => navigation.navigate('RideHistory')} style={styles.smallButton} />
          <PrimaryButton title="Stats" variant="secondary" onPress={() => navigation.navigate('Dashboard')} style={styles.smallButton} />
        </View>
        <PrimaryButton title="Request ride" onPress={handleRequestRide} disabled={!pickup || !destination} loading={requesting} />
      </View>
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
