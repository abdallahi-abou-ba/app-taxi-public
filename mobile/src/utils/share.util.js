import { Share } from 'react-native';

export function shareText(message) {
  Share.share({ message }).catch(() => {});
}
