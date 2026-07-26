import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PAYMENT_METHOD_LOGOS } from '../config/paymentLogos';

// Renders the real brand logo for Bankily/Sedad/Masrivi (white badge so it
// reads cleanly whether the surrounding pill is active or not), falling back
// to a generic Ionicon for every other method (Cash, etc).
export default function PaymentMethodIcon({ method, ionIconName, color, size = 20 }) {
  const logo = PAYMENT_METHOD_LOGOS[method];
  if (logo) {
    return (
      <View style={[styles.badge, { width: size, height: size }]}>
        <Image source={logo} style={styles.image} resizeMode="contain" />
      </View>
    );
  }
  return <Ionicons name={ionIconName} size={size - 6} color={color} />;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
