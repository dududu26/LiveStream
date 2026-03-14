// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useStreams } from '@/hooks/useStreams';
import { Avatar } from '@/components/ui/Avatar';
import { LiveBadge } from '@/components/ui/LiveBadge';

function formatCount(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { streams } = useStreams();

  const sorted = [...streams].sort((a, b) => b.viewerCount - a.viewerCount);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>🔥 Top Live Now</Text>
      <Text style={styles.sub}>Ranked by viewers</Text>

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/watch/[id]', params: { id: item.id, hostId: item.hostId, hostName: item.hostName, avatarColor: item.avatarColor, title: item.title, viewerCount: item.viewerCount.toString(), likeCount: item.likeCount.toString() } })}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Text style={styles.rank}>{MEDALS[index] ?? `${index + 1}`}</Text>
            <Avatar username={item.hostName} color={item.avatarColor} size={46} />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.hostName}</Text>
                <LiveBadge small />
              </View>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <View style={styles.statsRow}>
                <MaterialIcons name="remove-red-eye" size={12} color={Colors.textMuted} />
                <Text style={styles.stat}>{formatCount(item.viewerCount)}</Text>
                <Text style={styles.divider}>·</Text>
                <MaterialIcons name="favorite" size={12} color={Colors.primary} />
                <Text style={styles.stat}>{formatCount(item.likeCount)}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  heading: { color: Colors.white, fontSize: Fonts.xl, fontWeight: '800', paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sub: { color: Colors.textMuted, fontSize: Fonts.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100, gap: Spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  pressed: { opacity: 0.8 },
  rank: { fontSize: 22, width: 32, textAlign: 'center' },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: Colors.white, fontSize: Fonts.base, fontWeight: '700' },
  title: { color: Colors.textSecondary, fontSize: Fonts.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  stat: { color: Colors.textMuted, fontSize: Fonts.xs },
  divider: { color: Colors.textMuted, fontSize: Fonts.xs },
});
