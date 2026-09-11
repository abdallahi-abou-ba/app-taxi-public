import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MoreMenuList from '../../components/MoreMenuList';
import { colors } from '../../theme/theme';

export default function DriverMoreScreen({ navigation }) {
  const { t } = useTranslation();

  const items = [
    { key: 'history', icon: 'time-outline', label: t('common.history'), onPress: () => navigation.navigate('RideHistory') },
    { key: 'stats', icon: 'stats-chart-outline', label: t('common.stats'), onPress: () => navigation.navigate('Dashboard') },
    { key: 'referral', icon: 'gift-outline', label: t('common.referral'), onPress: () => navigation.navigate('Referral') },
    { key: 'notifications', icon: 'notifications-outline', label: t('common.notifications'), onPress: () => navigation.navigate('Notifications') },
    { key: 'recharge', icon: 'card-outline', label: t('common.recharge'), onPress: () => navigation.navigate('Recharge') },
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
