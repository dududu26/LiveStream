// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useStreams } from '@/hooks/useStreams';
import { useUser } from '@/hooks/useUser';
import { StreamCard } from '@/components/feature/StreamCard';
import { StreamRoom } from '@/services/websocket';

export default function FollowingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { streams } = useStreams();
  const { user, isFollowing } = useUser();

  const followedStreams = streams.filter(s => user?.following.includes(s.hostId));

  const onPress = (stream: StreamRoom) => {
    router.push({ pathname: '/watch/[id]', params: { id: stream.id, hostId: stream.hostId, hostName: stream.hostName, avatarColor: stream.avatarColor, title: stream.title, viewerCount: stream.viewerCount.toString(), likeCount: stream.likeCount.toString() } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Following</Text>

      {followedStreams.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💫</Text>
          <Text style={styles.emptyTitle}>No one live yet</Text>
          <Text style={styles.emptySub}>Follow hosts from streams to see them here when they go live</Text>
          <Pressable onPress={() => router.push('/')} style={styles.discoverBtn}>
            <Text style={styles.discoverText}>Discover Streams</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={followedStreams}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <StreamCard stream={item} onPress={onPress} isFollowing />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  heading: {
    color: Colors.white,
    fontSize: Fonts.xl,
    fontWeight: '800',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: Colors.white, fontSize: Fonts.lg, fontWeight: '700' },
  emptySub: { color: Colors.textSecondary, fontSize: Fonts.sm, textAlign: 'center', lineHeight: 20 },
  discoverBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  discoverText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.base },
});
