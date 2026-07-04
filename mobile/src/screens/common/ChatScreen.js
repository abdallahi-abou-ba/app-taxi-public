import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { listMessages, sendMessage } from '../../api/messageApi';
import ErrorBanner from '../../components/ErrorBanner';
import LoadingOverlay from '../../components/LoadingOverlay';
import { colors, radius, spacing } from '../../theme/theme';

export default function ChatScreen({ route }) {
  const { t, i18n } = useTranslation();
  const { rideId } = route.params;
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listMessages(rideId)
      .then(setMessages)
      .catch((err) => setError(err.message || t('chat.loadError')));
  }, [rideId, t]);

  const handleIncoming = useCallback(
    (message) => {
      if (message.rideId !== rideId) return;
      setMessages((current) => {
        if (!current) return [message];
        if (current.some((m) => m.id === message.id)) return current;
        return [...current, message];
      });
    },
    [rideId]
  );

  useEffect(() => {
    if (!socket) return undefined;
    socket.on('chat:message', handleIncoming);
    return () => socket.off('chat:message', handleIncoming);
  }, [socket, handleIncoming]);

  // Not an optimistic local append - the message only lands once the
  // chat:message socket echo comes back (see message.service.js), so there's
  // one source of truth for what's actually in the thread.
  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    setError(null);
    setSending(true);
    try {
      await sendMessage(rideId, body);
    } catch (err) {
      setError(err.message || t('chat.sendError'));
    } finally {
      setSending(false);
    }
  };

  if (!messages && !error) return <LoadingOverlay message={t('splash.loading')} />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ErrorBanner message={error} />
      <FlatList
        ref={listRef}
        data={messages || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={styles.empty}>{t('chat.empty')}</Text>}
        renderItem={({ item }) => {
          const isMine = item.sender.id === user.id;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
              <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                {new Date(item.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
        >
          <Ionicons name="send" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: 8,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 40,
    fontWeight: '500',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  bubbleTextMine: {
    color: colors.onPrimary,
  },
  bubbleTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(28,28,30,0.55)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
