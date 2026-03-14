// Powered by OnSpace.AI
import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { StreamRoom } from '@/services/websocket';
import { Avatar } from '@/components/ui/Avatar';
import { LiveBadge } from '@/components/ui/LiveBadge';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = (SCREEN_W - Spacing.md * 3) / 2;
const CARD_H = CARD_W * 1.5;

interface StreamCardProps {
  stream: StreamRoom;
  onPress: (stream: StreamRoom) => void;
  isFollowing?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export const StreamCard = memo(function StreamCard({ stream, onPress, isFollowing }: StreamCardProps) {
  return (
    <Pressable onPress={() => onPress(stream)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.thumbnail}>
        {/* Gradient background as thumbnail placeholder */}
        <LinearGradient
          colors={[stream.avatarColor + '88', '#111111']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.hostInitial}>
          <Text style={[styles.initialText, { color: stream.avatarColor }]}>
            {stream.hostName[0].toUpperCase()}
          </Text>
        </View>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
        />
        <View style={styles.topRow}>
          <LiveBadge small />
          {isFollowing && (
            <View style={styles.followedBadge}>
              <Text style={styles.followedText}>Following</Text>
            </View>
          )}
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.title} numberOfLines={2}>{stream.title}</Text>
          <View style={styles.meta}>
            <MaterialIcons name="remove-red-eye" size={12} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{formatCount(stream.viewerCount)}</Text>
            {stream.category ? (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{stream.category}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.hostRow}>
        <Avatar username={stream.hostName} color={stream.avatarColor} size={26} />
        <Text style={styles.hostName} numberOfLines={1}>{stream.hostName}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    marginBottom: Spacing.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  thumbnail: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
  },
  hostInitial: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
  },
  initialText: {
    fontSize: 56,
    fontWeight: '900',
    opacity: 0.35,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  topRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  followedBadge: {
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  followedText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '600',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  title: {
    color: Colors.white,
    fontSize: Fonts.xs + 1,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: Fonts.xs,
  },
  categoryTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  categoryText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '500',
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  hostName: {
    color: Colors.textSecondary,
    fontSize: Fonts.xs + 1,
    flex: 1,
  },
});
