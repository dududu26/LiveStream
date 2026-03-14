// Powered by OnSpace.AI
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface FloatingHeartProps {
  id: number;
  x: number;
  y: number;
  emoji?: string;
  onDone: (id: number) => void;
}

export function FloatingHeart({ id, x, y, emoji = '❤️', onDone }: FloatingHeartProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const randX = (Math.random() - 0.5) * 80;
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]),
      Animated.timing(translateY, { toValue: -200 - Math.random() * 100, duration: 1400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
      Animated.timing(rotate, {
        toValue: randX,
        duration: 1400,
        useNativeDriver: true,
      }),
    ]).start(() => onDone(id));
  }, []);

  const rotateStr = rotate.interpolate({
    inputRange: [-40, 40],
    outputRange: ['-20deg', '20deg'],
  });

  return (
    <Animated.View
      style={[
        styles.heart,
        {
          left: x - 15,
          top: y - 15,
          opacity,
          transform: [{ translateY }, { scale }, { rotate: rotateStr }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
});
