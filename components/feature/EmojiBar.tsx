// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { EMOJIS } from '@/constants/config';

interface EmojiBarProps {
  onSelect: (emoji: string) => void;
}

export function EmojiBar({ onSelect }: EmojiBarProps) {
  return (
    <View style={styles.outer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => onSelect(emoji)}
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Radius.lg,
  },
  content: {
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pressed: {
    backgroundColor: Colors.bgElevated,
    transform: [{ scale: 1.3 }],
  },
  emoji: {
    fontSize: 22,
  },
});
