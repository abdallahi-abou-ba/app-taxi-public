import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MoreMenuList from '../../components/MoreMenuList';
import { colors } from '../../theme/theme';

export default function ClientMoreScreen({ navigation }) {
  const { t } = useTranslation();

  const items = [
    { key: 'stats', icon: 'stats-chart-outline', label: t('common.stats'), onPress: () => navigation.navigate('Dashboard') },
    { key: 'reservations', icon: 'calendar-outline', label: t('common.reservations'), onPress: () => navigation.navigate('ScheduledRides') },
    { key: 'referral', icon: 'gift-outline', label: t('common.referral'), onPress: () => navigation.navigate('Referral') },
  ];

  return (
    <View style={styles.container}>
      <MoreMenuList items={items} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
