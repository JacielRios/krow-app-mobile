import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { colors } from '../../../shared/theme/colors';
import { radii, shadows, spacing, typography } from '../../../shared/theme/tokens';
import { supabase } from '../../../services/supabase';
import type { MainStackParamList } from '../../../app/navigation/MainNavigator';

type RouteProp = NativeStackScreenProps<MainStackParamList, 'Chat'>['route'];
type Nav = NativeStackNavigationProp<MainStackParamList, 'Chat'>;

interface ChatMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

const getAvatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors.avatarColors[Math.abs(hash) % colors.avatarColors.length];
};

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const insets = useSafeAreaInsets();
  const rideId = route.params?.rideId ?? null;

  const [chatId, setChatId] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const nameCache = useRef<Map<string, string>>(new Map());

  const resolveName = useCallback(async (userId: string): Promise<string> => {
    if (nameCache.current.has(userId)) return nameCache.current.get(userId)!;
    const { data } = await supabase.from('users').select('full_name').eq('uuid', userId).maybeSingle();
    const name = data?.full_name ?? 'Usuario';
    nameCache.current.set(userId, name);
    return name;
  }, []);

  // Load chat + messages
  useEffect(() => {
    if (!rideId) return;
    let active = true;
    const init = async () => {
      setLoading(true);
      const authRes = await supabase.auth.getUser();
      const uid = authRes.data.user?.id ?? null;
      if (!active) return;
      setMyUserId(uid);

      const { data: chat } = await supabase
        .from('chats').select('chat_id, closed_at').eq('ride_id', rideId).maybeSingle();
      if (!active) return;
      if (!chat) { setChatId(null); setIsClosed(false); setLoading(false); return; }

      setChatId(chat.chat_id);
      setIsClosed(chat.closed_at != null);

      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('message_id, chat_id, sender_id, content, created_at')
        .eq('chat_id', chat.chat_id)
        .order('created_at', { ascending: true });

      if (!active) return;
      const resolved: ChatMessage[] = [];
      for (const m of msgs ?? []) {
        const name = await resolveName(m.sender_id);
        resolved.push({
          messageId: m.message_id, chatId: m.chat_id, senderId: m.sender_id,
          senderName: name, content: m.content, createdAt: m.created_at,
        });
      }
      if (!active) return;
      setMessages(resolved);
      setLoading(false);
    };
    init();
    return () => { active = false; };
  }, [rideId, resolveName]);

  // Realtime
  useEffect(() => {
    if (!chatId) return;
    const channel: RealtimeChannel = supabase
      .channel(`chat-messages:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `chat_id=eq.${chatId}`,
      }, async (payload: any) => {
        const row = payload?.new;
        if (!row) return;
        const name = await resolveName(row.sender_id);
        const newMsg: ChatMessage = {
          messageId: row.message_id, chatId: row.chat_id, senderId: row.sender_id,
          senderName: name, content: row.content, createdAt: row.created_at,
        };
        setMessages(prev => {
          if (prev.some(m => m.messageId === newMsg.messageId)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, resolveName]);

  // Scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !myUserId || sending) return;
    setSending(true);
    setInputText('');
    try {
      let targetChatId = chatId;
      if (!targetChatId) {
        const { data: newChat, error: chatError } = await supabase
          .from('chats').insert({ ride_id: rideId }).select('chat_id').single();
        if (chatError || !newChat) { setInputText(text); setSending(false); return; }
        targetChatId = newChat.chat_id;
        setChatId(targetChatId);
      }
      const { error: msgError } = await supabase
        .from('chat_messages').insert({ chat_id: targetChatId, sender_id: myUserId, content: text });
      if (msgError) setInputText(text);
    } finally { setSending(false); }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === myUserId;
    return (
      <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther]}>
        {!isMe && (
          <View style={[styles.bubbleAvatar, { backgroundColor: getAvatarColor(item.senderId) }]}>
            <Text style={styles.bubbleAvatarText}>
              {item.senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && <Text style={styles.senderLabel}>{item.senderName}</Text>}
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.content}
          </Text>
          <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeOther]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chat del viaje</Text>
          {isClosed && <Text style={styles.closedTag}>Solo lectura</Text>}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.emptyCenter}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : !chatId && messages.length === 0 ? (
        <View style={styles.emptyCenter}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="chat-bubble-outline" size={40} color={colors.text.muted} />
          </View>
          <Text style={styles.emptyTitle}>Inicia la conversación</Text>
          <Text style={styles.emptySubtitle}>
            Envía el primer mensaje para coordinar con tu grupo de viaje.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.messageId}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      {!isClosed && (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.text.placeholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <MaterialIcons name="send" size={18} color={colors.text.inverse} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {isClosed && (
        <View style={[styles.closedBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <MaterialIcons name="lock" size={16} color={colors.text.secondary} />
          <Text style={styles.closedBarText}>Chat cerrado al finalizar el viaje.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // ── Header ─────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...shadows.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  closedTag: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },

  // ── Empty ──────────────────────────────
  emptyCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    rowGap: spacing.sm, padding: spacing.xl,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.border.light,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Messages ───────────────────────────
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bubbleWrap: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    maxWidth: '85%',
  },
  bubbleWrapMe: {
    alignSelf: 'flex-end',
  },
  bubbleWrapOther: {
    alignSelf: 'flex-start',
  },
  bubbleAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  bubbleAvatarText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.xl,
    maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: radii.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  senderLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accent,
    marginBottom: 2,
  },
  msgText: { fontSize: typography.size.md, lineHeight: 20 },
  msgTextMe: { color: colors.text.inverse },
  msgTextOther: { color: colors.text.primary },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMe: { color: 'rgba(255,255,255,0.65)' },
  msgTimeOther: { color: colors.text.tertiary },

  // ── Input bar ──────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    columnGap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.surface,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  // ── Closed bar ─────────────────────────
  closedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    columnGap: spacing.xs, paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  closedBarText: { fontSize: typography.size.sm, color: colors.text.secondary },
});
