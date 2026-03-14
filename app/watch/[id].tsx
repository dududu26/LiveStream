// Powered by OnSpace.AI
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, StatusBar,
  GestureResponderEvent, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { FloatingHeart } from '@/components/feature/FloatingHeart';
import { EmojiRain } from '@/components/feature/EmojiRain';
import { Avatar } from '@/components/ui/Avatar';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { EMOJIS } from '@/constants/config';
import { socketService } from '@/services/socketioService';
import { webrtcService } from '@/services/webrtcService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface HeartItem { id: number; x: number; y: number; emoji: string; }
interface RainDrop { id: number; emoji: string; startX: number; }
interface ChatMsg { id: number; name: string; text: string; isHost: boolean; color: string; }

let heartCounter = 0;
let rainCounter = 0;
let chatCounter = 0;

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ── Web Video Element ─────────────────────────────────────────────
function LiveVideoElement({ streamRef }: { streamRef: React.MutableRefObject<MediaStream | null> }) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Buat <video> element HTML langsung (Expo Web)
    if (typeof document === 'undefined') return;

    const container = document.getElementById('live-video-container');
    if (!container) return;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = false;
    video.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:0;background:#000';
    container.appendChild(video);
    videoElRef.current = video;

    // Pasang stream jika sudah ada
    if (streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }

    return () => {
      video.srcObject = null;
      container.removeChild(video);
    };
  }, []);

  // Update srcObject saat stream berubah
  useEffect(() => {
    const iv = setInterval(() => {
      if (streamRef.current && videoElRef.current && videoElRef.current.srcObject !== streamRef.current) {
        videoElRef.current.srcObject = streamRef.current;
        videoElRef.current.play().catch(() => {});
      }
    }, 300);
    return () => clearInterval(iv);
  }, []);

  return null; // Rendering dihandle oleh DOM langsung
}

export default function WatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user, toggleFollow, isFollowing } = useUser();

  const streamId = params.id as string;
  const hostName = (params.hostName as string) || 'Host';
  const avatarColor = (params.avatarColor as string) || Colors.primary;
  const title = (params.title as string) || '';
  const hostId = (params.hostId as string) || '';

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [chatText, setChatText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [hearts, setHearts] = useState<HeartItem[]>([]);
  const [rainDrops, setRainDrops] = useState<RainDrop[]>([]);
  const [following, setFollowing] = useState(isFollowing(hostId));
  const [connected, setConnected] = useState(false);
  const [videoConnected, setVideoConnected] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const lastTapRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const viewerName = user?.username || `Anon${Math.floor(Math.random() * 9000) + 1000}`;

  // ── Connect ke Socket.io server ───────────────────────────────
  useEffect(() => {
    let unsubs: Array<() => void> = [];

    const init = async () => {
      const ok = await socketService.connect();
      setConnected(ok);

      if (ok) {
        // Join room sebagai viewer
        socketService.joinStream(streamId, viewerName);

        // Terima info stream
        unsubs.push(socketService.on('viewer:joined', (data: any) => {
          // Sukses join
          addSysMsg(`Kamu bergabung sebagai ${data.viewerName}`);
        }));

        // Chat masuk
        unsubs.push(socketService.on('chat:message', (msg: any) => {
          addChatMsg(msg.name, msg.text, msg.isHost);
        }));

        // System message
        unsubs.push(socketService.on('chat:system', (data: any) => {
          addSysMsg(data.text);
        }));

        // Viewer count
        unsubs.push(socketService.on('viewer:count', (data: any) => {
          setViewerCount(data.count ?? 0);
        }));

        // Like update
        unsubs.push(socketService.on('like:update', (data: any) => {
          setLikeCount(data.total ?? 0);
        }));

        // Emoji rain dari penonton lain
        unsubs.push(socketService.on('emoji:rain', (data: any) => {
          spawnEmojiRain(data.emoji, 12);
        }));

        // Stream berakhir
        unsubs.push(socketService.on('stream:ended', (data: any) => {
          setStreamEnded(true);
          webrtcService.stopStream();
        }));

        // Error
        unsubs.push(socketService.on('error', (data: any) => {
          addSysMsg('Error: ' + (data.message || 'Terjadi kesalahan'));
        }));

        // ── WebRTC: sambung video stream ───────────────────────
        if (webrtcService.isSupported()) {
          await webrtcService.startAsViewer({
            onRemoteStream: (stream) => {
              streamRef.current = stream;
              setVideoConnected(true);
            },
            onConnectionChange: (state) => {
              if (state === 'connected') setVideoConnected(true);
              if (state === 'closed' || state === 'failed') setVideoConnected(false);
            },
          });
        }
      } else {
        // Offline mode: tampilkan pesan
        addSysMsg('Tidak dapat terhubung ke server. Mode offline.');
      }
    };

    init();

    return () => {
      unsubs.forEach(u => u());
      webrtcService.stopStream();
    };
  }, [streamId]);

  const addChatMsg = (name: string, text: string, isHost: boolean) => {
    const COLORS = ['#FF2D55','#FF6B35','#FFD700','#34C759','#007AFF','#AF52DE','#FF9500'];
    setMessages(prev => {
      const next = [...prev.slice(-60), {
        id: chatCounter++,
        name,
        text,
        isHost,
        color: COLORS[name.length % COLORS.length],
      }];
      return next;
    });
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const addSysMsg = (text: string) => {
    setMessages(prev => [...prev.slice(-60), {
      id: chatCounter++,
      name: '🔔 Sistem',
      text,
      isHost: false,
      color: '#888',
    }]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── Spawn floating hearts ──────────────────────────────────────
  const spawnHeart = useCallback((x: number, y: number, emoji?: string) => {
    const id = heartCounter++;
    const em = emoji ?? EMOJIS[Math.floor(Math.random() * 4)];
    setHearts(prev => [...prev.slice(-20), { id, x, y, emoji: em }]);
  }, []);

  // ── Emoji Rain ─────────────────────────────────────────────────
  const spawnEmojiRain = useCallback((emoji: string, count = 15) => {
    const drops: RainDrop[] = Array.from({ length: count }, () => ({
      id: rainCounter++,
      emoji,
      startX: Math.random() * SCREEN_W,
    }));
    setRainDrops(prev => [...prev.slice(-80), ...drops]);
  }, []);

  const removeRainDrop = useCallback((id: number) => {
    setRainDrops(prev => prev.filter(d => d.id !== id));
  }, []);

  const removeHeart = useCallback((id: number) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  // ── Double-tap ─────────────────────────────────────────────────
  const handleTap = useCallback((e: GestureResponderEvent) => {
    const now = Date.now();
    const { locationX, locationY } = e.nativeEvent;
    if (now - lastTapRef.current < 300) {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnHeart(
          locationX + (Math.random() - 0.5) * 60,
          locationY + (Math.random() - 0.5) * 60,
        ), i * 80);
      }
      socketService.sendLike(5);
    }
    lastTapRef.current = now;
  }, [spawnHeart]);

  // ── Kirim chat ─────────────────────────────────────────────────
  const sendChat = () => {
    const text = chatText.trim();
    if (!text) return;
    // Tampilkan lokal dulu
    addChatMsg(viewerName, text, false);
    // Kirim ke server
    socketService.sendChat(text);
    setChatText('');
    setShowEmoji(false);
  };

  // ── Tap emoji ─────────────────────────────────────────────────
  const sendEmojiMsg = useCallback((emoji: string) => {
    addChatMsg(viewerName, emoji, false);
    socketService.sendChat(emoji);
    socketService.sendEmoji(emoji);
    spawnEmojiRain(emoji, 18);
    spawnHeart(SCREEN_W * 0.5, SCREEN_H * 0.6, emoji);
  }, [spawnEmojiRain, spawnHeart]);

  // ── Like ───────────────────────────────────────────────────────
  const sendLike = () => {
    spawnHeart(SCREEN_W - 60, SCREEN_H * 0.5);
    socketService.sendLike(1);
  };

  const handleFollow = async () => {
    const now = await toggleFollow(hostId);
    setFollowing(now);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Video Layer ── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
        {/* Container untuk video HTML element */}
        <View style={StyleSheet.absoluteFill} nativeID="live-video-container">
          {webrtcService.isSupported() && <LiveVideoElement streamRef={streamRef} />}
        </View>

        {/* Gradient background (muncul di belakang / saat video belum konek) */}
        {!videoConnected && (
          <LinearGradient
            colors={[avatarColor + 'CC', '#000']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
          />
        )}

        {/* Status connecting */}
        {!videoConnected && !streamEnded && (
          <View style={styles.connectingBox}>
            <Text style={[styles.hostLetter, { color: avatarColor }]}>
              {hostName[0]?.toUpperCase()}
            </Text>
            <View style={styles.connectingRow}>
              <View style={styles.connectingDot} />
              <Text style={styles.connectingText}>
                {connected ? 'Menghubungkan video...' : 'Menghubungkan ke server...'}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.doubleTapHint}>Ketuk 2x untuk kirim ❤️</Text>
      </Pressable>

      {/* ── Stream Ended Overlay ── */}
      {streamEnded && (
        <View style={styles.endedOverlay}>
          <Text style={{ fontSize: 56 }}>📡</Text>
          <Text style={styles.endedTitle}>Siaran Berakhir</Text>
          <Pressable onPress={() => router.back()} style={styles.endedBtn}>
            <Text style={styles.endedBtnText}>Kembali ke Beranda</Text>
          </Pressable>
        </View>
      )}

      {/* ── Emoji Rain ── */}
      <EmojiRain drops={rainDrops} onDone={removeRainDrop} />

      {/* ── Floating Hearts ── */}
      {hearts.map(h => (
        <FloatingHeart key={h.id} {...h} onDone={removeHeart} />
      ))}

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.hostInfo}>
          <Avatar username={hostName} color={avatarColor} size={38} />
          <View>
            <Text style={styles.hostName}>{hostName}</Text>
            <View style={styles.liveRow}>
              <LiveBadge small />
              <Text style={styles.viewers}>👁 {formatCount(viewerCount)}</Text>
            </View>
          </View>
          <Pressable onPress={handleFollow} style={[styles.followBtn, following && styles.followingBtn]}>
            <Text style={styles.followText}>{following ? '✓ Following' : '+ Follow'}</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.white} />
        </Pressable>
      </View>

      {/* Judul stream */}
      {title ? (
        <View style={styles.titleBox}>
          <Text style={styles.streamTitle}>{title}</Text>
        </View>
      ) : null}

      {/* ── Like Count (sisi kanan) ── */}
      <View style={[styles.sideActions, { bottom: insets.bottom + 120 }]}>
        <Pressable onPress={sendLike} style={styles.actionBtn}>
          <Text style={styles.actionEmoji}>❤️</Text>
          <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => {
          if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({ title: `Tonton ${hostName}`, url: location.href });
          }
        }}>
          <MaterialIcons name="share" size={26} color={Colors.white} />
          <Text style={styles.actionCount}>Bagikan</Text>
        </Pressable>
      </View>

      {/* ── Chat + Input ── */}
      <KeyboardAvoidingView
        style={[styles.bottomArea, { paddingBottom: insets.bottom + 8 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat messages */}
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          pointerEvents="none"
        >
          {messages.map(msg => (
            <View key={msg.id} style={styles.msgRow}>
              <View style={styles.bubble}>
                <Text style={[styles.msgName, { color: msg.isHost ? '#FFD700' : msg.color }]}>
                  {msg.name}
                </Text>
                <Text style={styles.msgText}>{msg.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Emoji bar */}
        {showEmoji && (
          <View style={styles.emojiBarOuter}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiBarContent}>
              {EMOJIS.map(e => (
                <Pressable key={e} onPress={() => sendEmojiMsg(e)} style={styles.emojiBtn}>
                  <Text style={styles.emojiBtnText}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input row */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  connectingBox: {
    position: 'absolute',
    alignSelf: 'center',
    top: '28%',
    alignItems: 'center',
    gap: 16,
  },
  hostLetter: { fontSize: 120, fontWeight: '900', opacity: 0.15 },
  connectingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectingDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary,
  },
  connectingText: { color: 'rgba(255,255,255,0.6)', fontSize: Fonts.sm },
  doubleTapHint: {
    position: 'absolute', bottom: '34%', alignSelf: 'center',
    color: 'rgba(255,255,255,0.2)', fontSize: Fonts.sm,
  },

  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 50,
  },
  endedTitle: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  endedBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  endedBtnText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.base },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  hostInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.full,
    paddingRight: 12, paddingLeft: 6, paddingVertical: 6,
  },
  hostName: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sm },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewers: { color: Colors.textSecondary, fontSize: Fonts.xs },
  followBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.white },
  followText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.xs },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  titleBox: { position: 'absolute', top: 100, left: Spacing.md, right: 80 },
  streamTitle: {
    color: Colors.white, fontSize: Fonts.base, fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  sideActions: {
    position: 'absolute', right: Spacing.md, gap: 20, alignItems: 'center',
  },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionEmoji: { fontSize: 30 },
  actionCount: { color: Colors.white, fontSize: Fonts.xs, fontWeight: '600' },

  bottomArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  chatScroll: { maxHeight: 240 },
  chatContent: { paddingBottom: 4, gap: 5 },
  msgRow: { flexDirection: 'row' },
  bubble: {
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: Radius.md,
    paddingHorizontal: 10, paddingVertical: 5,
    maxWidth: '85%',
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center',
  },
  msgName: { fontSize: Fonts.xs, fontWeight: '700' },
  msgText: { color: Colors.white, fontSize: Fonts.sm, lineHeight: 18 },

  emojiBarOuter: {
    height: 48, backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Radius.lg,
  },
  emojiBarContent: {
    paddingHorizontal: Spacing.sm, alignItems: 'center', gap: 4,
  },
  emojiBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  emojiBtnText: { fontSize: 22 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    gap: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  emojiToggle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, color: Colors.white, fontSize: Fonts.base, padding: 0, maxHeight: 80,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.bgElevated },
});
