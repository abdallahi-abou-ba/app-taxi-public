import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MoreMenuList from '../../components/MoreMenuList';
import { useTheme } from '../../context/ThemeContext';

export default function DriverMoreScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, theme, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const items = [
    { key: 'history', icon: 'time-outline', label: t('common.history'), onPress: () => navigation.navigate('RideHistory') },
    { key: 'stats', icon: 'stats-chart-outline', label: t('common.stats'), onPress: () => navigation.navigate('Dashboard') },
    { key: 'referral', icon: 'gift-outline', label: t('common.referral'), onPress: () => navigation.navigate('Referral') },
    { key: 'notifications', icon: 'notifications-outline', label: t('common.notifications'), onPress: () => navigation.navigate('Notifications') },
    { key: 'recharge', icon: 'card-outline', label: t('common.recharge'), onPress: () => navigation.navigate('Recharge') },
    {
      key: 'theme',
      icon: theme === 'dark' ? 'sunny-outline' : 'moon-outline',
      label: theme === 'dark' ? t('common.lightMode') : t('common.darkMode'),
      onPress: toggleTheme,
      showChevron: false,
    },
  ];

  return (
    <View style={styles.container}>
      <MoreMenuList items={items} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
