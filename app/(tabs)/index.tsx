// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useStreams } from '@/hooks/useStreams';
import { useUser } from '@/hooks/useUser';
import { StreamCard } from '@/components/feature/StreamCard';
import { StreamRoom } from '@/services/websocket';

const CATEGORIES = ['All', 'Gaming', 'Music', 'Talk', 'Food', 'Fitness', 'Art'];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { streams, loading, serverConnected } = useStreams();
  const { isFollowing } = useUser();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = streams.filter(s => {
    const matchCat = category === 'All' || s.category === category;
    const matchSearch = !search || s.hostName.toLowerCase().includes(search.toLowerCase()) || s.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const onPress = (stream: StreamRoom) => {
    router.push({ pathname: '/watch/[id]', params: { id: stream.id, hostId: stream.hostId, hostName: stream.hostName, avatarColor: stream.avatarColor, title: stream.title, viewerCount: stream.viewerCount.toString(), likeCount: stream.likeCount.toString() } });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🔴 LiveStream</Text>
        <View style={styles.headerRight}>
          {!serverConnected && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoText}>DEMO</Text>
            </View>
          )}
          <Pressable style={styles.searchBtn}>
            <MaterialIcons name="notifications-none" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search streams or hosts..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={16} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.catOuter}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
          renderItem={({ item }) => {
            const active = item === category;
            return (
              <Pressable
                onPress={() => setCategory(item)}
                style={[styles.catBtn, active && styles.catBtnActive]}
              >
                <Text style={[styles.catText, active && styles.catTextActive]}>{item}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Live Count Bar */}
      <View style={styles.liveBar}>
        <View style={styles.liveDot} />
        <Text style={styles.liveCount}>{filtered.length} live now</Text>
        {!serverConnected && (
          <Text style={styles.demoNote}>· Configure server URL to go real-time</Text>
        )}
      </View>

      {/* Grid */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <StreamCard
              stream={item}
              onPress={onPress}
              isFollowing={isFollowing(item.hostId)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyText}>No streams found</Text>
              <Text style={styles.emptySubtext}>Try a different category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  logo: {
    color: Colors.white,
    fontSize: Fonts.lg,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  demoBadge: {
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  demoText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchBtn: {
    padding: 4,
  },
  searchRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: Fonts.base,
    padding: 0,
  },
  catOuter: {
    height: 48,
  },
  catList: {
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  catBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sm,
    fontWeight: '600',
  },
  catTextActive: {
    color: Colors.white,
  },
  liveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
  },
  liveCount: {
    color: Colors.textSecondary,
    fontSize: Fonts.sm,
    fontWeight: '600',
  },
  demoNote: {
    color: Colors.textMuted,
    fontSize: Fonts.xs,
  },
  grid: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: '600' },
  emptySubtext: { color: Colors.textMuted, fontSize: Fonts.sm },
});
