// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

interface AvatarProps {
  username: string;
  color: string;
  size?: number;
  fontSize?: number;
}

export function Avatar({ username, color, size = 36, fontSize }: AvatarProps) {
  const letter = username ? username[0].toUpperCase() : '?';
  const fs = fontSize ?? Math.round(size * 0.4);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.letter, { fontSize: fs }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: Colors.white,
    fontWeight: '700',
  },
});
