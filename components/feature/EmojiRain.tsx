// Powered by OnSpace.AI
// EmojiRain: animasi hujan emoji melayang ke atas ketika viewer tap emoji
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, Dimensions, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface RainDrop {
  id: number;
  emoji: string;
  startX: number;
}

interface EmojiRainDropProps {
  id: number;
  emoji: string;
  startX: number;
  onDone: (id: number) => void;
}

export function EmojiRainDrop({ id, emoji, startX, onDone }: EmojiRainDropProps) {
  const translateY = useRef(new Animated.Value(SCREEN_H * 0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const randomDrift = (Math.random() - 0.5) * 60;
  const duration = 1800 + Math.random() * 1200;
  const size = 22 + Math.random() * 18;

  useEffect(() => {
    Animated.parallel([
      // Muncul cepat lalu fade out
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(duration - 500),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      // Naik ke atas
      Animated.timing(translateY, {
        toValue: -SCREEN_H * 0.15 - Math.random() * 100,
        duration,
        useNativeDriver: true,
      }),
      // Sedikit gerak horizontal (melayang)
      Animated.timing(translateX, {
        toValue: startX + randomDrift,
        duration,
        useNativeDriver: true,
      }),
      // Scale in
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1 + Math.random() * 0.3,
          tension: 200,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      // Rotasi sedikit
      Animated.timing(rotate, {
        toValue: (Math.random() - 0.5) * 30,
        duration,
        useNativeDriver: true,
      }),
    ]).start(() => onDone(id));
  }, []);

  const rotateStr = rotate.interpolate({
    inputRange: [-30, 30],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.drop,
        {
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate: rotateStr },
          ],
          opacity,
        },
      ]}
    >
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}

// Container yang manage banyak rain drop sekaligus
interface EmojiRainProps {
  drops: RainDrop[];
  onDone: (id: number) => void;
}

export function EmojiRain({ drops, onDone }: EmojiRainProps) {
  if (drops.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map(d => (
        <EmojiRainDrop key={d.id} {...d} onDone={onDone} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
    bottom: 0,
  },
});
