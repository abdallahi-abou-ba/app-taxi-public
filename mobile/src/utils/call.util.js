import * as Linking from 'expo-linking';

export function callPhone(phone) {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`);
}
