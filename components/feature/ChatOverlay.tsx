// Powered by OnSpace.AI
import React, { useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { ChatMessage } from '@/services/websocket';
import { Avatar } from '@/components/ui/Avatar';

interface ChatOverlayProps {
  messages: ChatMessage[];
}

export const ChatOverlay = memo(function ChatOverlay({ messages }: ChatOverlayProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        pointerEvents="none"
      >
        {messages.map((msg) => (
          <View key={msg.id} style={styles.msgRow}>
            <Avatar username={msg.username} color={msg.avatarColor} size={22} />
            <View style={styles.bubble}>
              <Text style={styles.username}>{msg.username}</Text>
              <Text style={styles.text}>{msg.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scroll: {
    maxHeight: 300,
  },
  content: {
    paddingBottom: Spacing.sm,
    gap: 6,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bubble: {
    backgroundColor: Colors.chatBg,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '85%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  username: {
    color: Colors.primary,
    fontSize: Fonts.xs,
    fontWeight: '700',
  },
  text: {
    color: Colors.white,
    fontSize: Fonts.sm,
    lineHeight: 18,
  },
});
