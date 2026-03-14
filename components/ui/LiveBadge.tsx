// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

interface LiveBadgeProps {
  small?: boolean;
}

export function LiveBadge({ small }: LiveBadgeProps) {
  return (
    <View style={[styles.badge, small && styles.small]}>
      <Text style={[styles.text, small && styles.smallText]}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.live,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  text: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  smallText: {
    fontSize: 10,
  },
});
