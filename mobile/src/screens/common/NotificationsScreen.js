import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getMyNotifications, markNotificationsRead } from '../../api/userApi';
import { navigate as navigateForNotification } from '../../hooks/useNotificationTapNavigation';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import { formatDateTime } from '../../utils/formatters';
import { colors, radius, shadow, spacing } from '../../theme/theme';

function iconForType(type) {
  if (type === 'driver:approval') return 'shield-checkmark-outline';
  if (type?.startsWith('settlement:')) return 'wallet-outline';
  if (type?.startsWith('wallet:')) return 'card-outline';
  if (type?.startsWith('ride:')) return 'car-outline';
  if (type?.startsWith('referral:')) return 'gift-outline';
  return 'notifications-outline';
}

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return getMyNotifications()
      .then((data) => {
        setNotifications(data);
        setError(null);
      })
      .catch((err) => setError(err.message || t('notifications.loadError')));
  }, [t]);

  // Opening this screen is the "I've seen these" moment - mark everything
  // read right after the list loads, same as tapping into any notification
  // center. Best-effort: a failure here shouldn't block the list itself.
  useFocusEffect(
    useCallback(() => {
      load().then(() => markNotificationsRead().catch(() => {}));
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handlePress = (item) => {
    navigateForNotification(item.data, user.role);
  };

  if (!notifications && !error) return <LoadingOverlay message={t('splash.loading')} />;

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-outline" size={40} color={colors.textMuted} />
            <Text style={styles.empty}>{t('notifications.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handlePress(item)}>
            <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
              <Ionicons name={iconForType(item.type)} size={18} color={item.read ? colors.textMuted : colors.primaryDark} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.date}>{formatDateTime(item.createdAt, i18n.language)}</Text>
            </View>
            {!item.read ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  iconWrapUnread: {
    backgroundColor: colors.primarySoft,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  titleUnread: {
    fontWeight: '800',
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  date: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    marginTop: 60,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '500',
  },
});
