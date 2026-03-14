// Powered by OnSpace.AI
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView,
  Platform, Dimensions, StatusBar, GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useLiveRoom } from '@/hooks/useLiveRoom';
import { useUser } from '@/hooks/useUser';
import { ChatOverlay } from '@/components/feature/ChatOverlay';
import { FloatingHeart } from '@/components/feature/FloatingHeart';
import { EmojiBar } from '@/components/feature/EmojiBar';
import { EmojiRain } from '@/components/feature/EmojiRain';
import { Avatar } from '@/components/ui/Avatar';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { EMOJIS } from '@/constants/config';
import { webrtcService } from '@/services/webrtcService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface HeartItem { id: number; x: number; y: number; emoji: string; }
interface RainDrop { id: number; emoji: string; startX: number; }
let heartCounter = 0;
let rainCounter = 0;

function formatCount(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function WatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user } = useUser();
  const { toggleFollow, isFollowing } = useUser();

  const roomId = params.id as string;
  const hostId = params.hostId as string;
  const hostName = params.hostName as string;
  const avatarColor = params.avatarColor as string;
  const title = params.title as string;

  const { messages, viewerCount, likeCount, sendMessage, sendLike } = useLiveRoom(roomId, user?.userId ?? 'anon');

  const [chatText, setChatText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [hearts, setHearts] = useState<HeartItem[]>([]);
  const [rainDrops, setRainDrops] = useState<RainDrop[]>([]);
  const [following, setFollowing] = useState(isFollowing(hostId));
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const lastTapRef = useRef(0);
  const videoRef = useRef<any>(null);

  // Coba sambung WebRTC sebagai viewer
  useEffect(() => {
    if (webrtcService.isSupported()) {
      webrtcService.startAsViewer(roomId, hostId, {
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
          if (videoRef.current && typeof videoRef.current.srcObject !== 'undefined') {
            videoRef.current.srcObject = stream;
          }
        },
      });
    }
    return () => {
      webrtcService.stopStream();
    };
  }, [roomId, hostId]);

  // ─── Spawn floating hearts (double-tap) ───────────────────────
  const spawnHeart = useCallback((x: number, y: number, emoji?: string) => {
    const id = heartCounter++;
    const em = emoji ?? EMOJIS[Math.floor(Math.random() * 4)];
    setHearts(prev => [...prev.slice(-20), { id, x, y, emoji: em }]);
    sendLike(1);
  }, [sendLike]);

  // ─── Spawn emoji rain (tap dari emoji bar) ────────────────────
  const spawnEmojiRain = useCallback((emoji: string, count: number = 15) => {
    const newDrops: RainDrop[] = Array.from({ length: count }, () => ({
      id: rainCounter++,
      emoji,
      startX: Math.random() * SCREEN_W,
    }));
    setRainDrops(prev => [...prev.slice(-80), ...newDrops]);
  }, []);

  const removeRainDrop = useCallback((id: number) => {
    setRainDrops(prev => prev.filter(d => d.id !== id));
  }, []);

  const removeHeart = useCallback((id: number) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  // ─── Double-tap handler ────────────────────────────────────────
  const handleTap = useCallback((e: GestureResponderEvent) => {
    const now = Date.now();
    const { locationX, locationY } = e.nativeEvent;
    if (now - lastTapRef.current < 300) {
      // Double tap: spawn 5 hearts
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          spawnHeart(
            locationX + (Math.random() - 0.5) * 60,
            locationY + (Math.random() - 0.5) * 60,
          );
        }, i * 80);
      }
    }
    lastTapRef.current = now;
  }, [spawnHeart]);

  const sendChat = () => {
    const text = chatText.trim();
    if (!text || !user) return;
    sendMessage(text, user.username, user.avatarColor);
    setChatText('');
    setShowEmoji(false);
  };

  // Tap emoji: kirim ke chat + hujan emoji
  const sendEmojiMsg = useCallback((emoji: string) => {
    if (!user) return;
    sendMessage(emoji, user.username, user.avatarColor);
    spawnEmojiRain(emoji, 18);
    // Juga spawn floating heart di tengah
    spawnHeart(SCREEN_W * 0.5 + (Math.random() - 0.5) * 100, SCREEN_H * 0.6, emoji);
  }, [user, sendMessage, spawnEmojiRain, spawnHeart]);

  const handleFollow = async () => {
    const nowFollowing = await toggleFollow(hostId);
    setFollowing(nowFollowing);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Video BG: WebRTC stream atau gradient placeholder ── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
        {remoteStream ? (
          // Web: attach via ref.srcObject
          <View style={StyleSheet.absoluteFill}>
            <RemoteVideoView videoRef={videoRef} />
          </View>
        ) : (
          <LinearGradient
            colors={[avatarColor + 'AA', '#000000']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
          />
        )}

        {/* Host watermark (jika tidak ada stream video) */}
        {!remoteStream && (
          <View style={styles.hostWatermark}>
            <Text style={[styles.watermarkLetter, { color: avatarColor }]}>
              {hostName[0]?.toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.doubleTapHint}>Ketuk 2x untuk kirim ❤️</Text>
      </Pressable>

      {/* ── Emoji Rain (melayang dari bawah ke atas) ── */}
      <EmojiRain drops={rainDrops} onDone={removeRainDrop} />

      {/* ── Floating Hearts (double-tap) ── */}
      {hearts.map(h => (
        <FloatingHeart key={h.id} {...h} onDone={removeHeart} />
      ))}

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.hostInfo}>
          <Avatar username={hostName} color={avatarColor} size={38} />
          <View>
            <Text style={styles.hostName}>{hostName}</Text>
            <View style={styles.liveRow}>
              <LiveBadge small />
              <Text style={styles.viewers}>
                <MaterialIcons name="remove-red-eye" size={11} color={Colors.textSecondary} />{' '}
                {formatCount(viewerCount)}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleFollow} style={[styles.followBtn, following && styles.followingBtn]}>
            <Text style={[styles.followText, following && styles.followingText]}>
              {following ? 'Following' : '+ Follow'}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.white} />
        </Pressable>
      </View>

      {/* Judul stream */}
      <View style={styles.titleBox}>
        <Text style={styles.streamTitle}>{title}</Text>
      </View>

      {/* Aksi samping kanan */}
      <View style={[styles.sideActions, { bottom: insets.bottom + 120 }]}>
        <Pressable onPress={() => spawnHeart(SCREEN_W - 60, SCREEN_H * 0.5)} style={styles.actionBtn}>
          <Text style={styles.actionEmoji}>❤️</Text>
          <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <MaterialIcons name="share" size={26} color={Colors.white} />
          <Text style={styles.actionCount}>Bagikan</Text>
        </Pressable>
      </View>

      {/* ── Chat + Input ── */}
      <KeyboardAvoidingView
        style={[styles.bottomArea, { paddingBottom: insets.bottom + 8 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatArea}>
          <ChatOverlay messages={messages} />
        </View>

        {/* Emoji Bar dengan rain effect */}
        {showEmoji && <EmojiBar onSelect={sendEmojiMsg} />}

        <View style={styles.inputRow}>
          <Pressable onPress={() => setShowEmoji(v => !v)} style={styles.emojiToggle}>
            <Text style={{ fontSize: 22 }}>😊</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Tulis pesan..."
            placeholderTextColor={Colors.textMuted}
            value={chatText}
            onChangeText={setChatText}
            onSubmitEditing={sendChat}
            returnKeyType="send"
            maxLength={200}
          />
          <Pressable onPress={sendChat} style={[styles.sendBtn, !chatText.trim() && styles.sendBtnDisabled]}>
            <MaterialIcons name="send" size={18} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Komponen video remote untuk viewer (WebRTC)
function RemoteVideoView({ videoRef }: { videoRef: React.RefObject<any> }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name="videocam" size={48} color="rgba(255,255,255,0.2)" />
      <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 8, fontSize: 13 }}>
        Menghubungkan video...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  hostWatermark: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
  },
  watermarkLetter: {
    fontSize: 140,
    fontWeight: '900',
    opacity: 0.08,
  },
  doubleTapHint: {
    position: 'absolute',
    bottom: '35%',
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.2)',
    fontSize: Fonts.sm,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.chatBg,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hostName: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sm },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewers: { color: Colors.textSecondary, fontSize: Fonts.xs },
  followBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.white,
  },
  followText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.xs },
  followingText: { color: Colors.white },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.chatBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: {
    position: 'absolute',
    top: 100,
    left: Spacing.md,
    right: 80,
  },
  streamTitle: {
    color: Colors.white,
    fontSize: Fonts.base,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sideActions: {
    position: 'absolute',
    right: Spacing.md,
    gap: 20,
    alignItems: 'center',
  },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionEmoji: { fontSize: 30 },
  actionCount: { color: Colors.white, fontSize: Fonts.xs, fontWeight: '600' },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  chatArea: { maxHeight: 280 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.chatBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiToggle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontSize: Fonts.base,
    padding: 0,
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.bgElevated,
  },
});
