// Powered by OnSpace.AI
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { Avatar } from '@/components/ui/Avatar';
import { LiveBadge } from '@/components/ui/LiveBadge';
import { socketService } from '@/services/socketioService';
import { webrtcService } from '@/services/webrtcService';

const CATEGORIES = ['Gaming', 'Music', 'Talk', 'Food', 'Fitness', 'Art', 'Other'];

interface ChatMsg { id: number; name: string; text: string; isHost: boolean; color: string; }
let chatCtr = 0;

// ── Komponen video lokal host (web) ───────────────────────────────
function LocalVideoElement({ streamRef }: { streamRef: React.MutableRefObject<MediaStream | null> }) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('local-video-container');
    if (!container) return;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // Host tidak perlu dengar suara sendiri
    video.style.cssText = [
      'width:100%', 'height:100%', 'object-fit:cover',
      'position:absolute', 'top:0', 'left:0', 'z-index:0',
      'background:#000', 'transform:scaleX(-1)', // Mirror untuk host
    ].join(';');
    container.appendChild(video);
    videoElRef.current = video;

    if (streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }

    return () => {
      video.srcObject = null;
      try { container.removeChild(video); } catch {}
    };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      if (streamRef.current && videoElRef.current &&
          videoElRef.current.srcObject !== streamRef.current) {
        videoElRef.current.srcObject = streamRef.current;
        videoElRef.current.play().catch(() => {});
      }
    }, 300);
    return () => clearInterval(iv);
  }, []);

  return null;
}

export default function GoLiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Talk');
  const [isLive, setIsLive] = useState(false);
  const [streamId, setStreamId] = useState('');
  const [duration, setDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingFront, setFacingFront] = useState(true);
  const [chatText, setChatText] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const COLORS = ['#FF2D55','#FF6B35','#FFD700','#34C759','#007AFF','#AF52DE'];

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      webrtcService.stopStream();
    };
  }, []);

  const addChatMsg = (name: string, text: string, isHost: boolean) => {
    setMessages(prev => {
      const next = [...prev.slice(-60), {
        id: chatCtr++, name, text, isHost,
        color: COLORS[name.length % COLORS.length],
      }];
      return next;
    });
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const addSysMsg = (text: string) => {
    addChatMsg('🔔 Sistem', text, false);
  };

  const startLive = async () => {
    if (!title.trim()) {
      Alert.alert('Tambah judul', 'Masukkan judul siaran terlebih dahulu');
      return;
    }
    if (!user) return;

    setCameraError(null);

    // 1. Sambung ke server
    const ok = await socketService.connect();
    setConnected(ok);

    if (!ok) {
      setCameraError('Tidak dapat terhubung ke server. Pastikan server berjalan dan URL ngrok benar.');
      return;
    }

    // 2. Setup listener Socket.io
    socketService.on('host:started', ({ streamId: id }: any) => {
      setStreamId(id);
      addSysMsg(`🔴 Siaran dimulai! Stream ID: ${id}`);
    });

    socketService.on('chat:message', (msg: any) => {
      addChatMsg(msg.name, msg.text, msg.isHost);
    });

    socketService.on('chat:system', (data: any) => {
      addSysMsg(data.text);
    });

    socketService.on('viewer:count', (data: any) => {
      setViewerCount(data.count ?? 0);
    });

    socketService.on('like:update', (data: any) => {
      setLikeCount(data.total ?? 0);
    });

    // 3. Mulai kamera + WebRTC
    const stream = await webrtcService.startAsStreamer({
      onLocalStream: (s) => {
        streamRef.current = s;
        setCameraReady(true);
      },
      onError: (err) => {
        setCameraError(err);
      },
    });

    // 4. Switch UI ke mode live
    setIsLive(true);
    setDuration(0);

    // 5. Beritahu server untuk mulai stream
    socketService.startStream(user.username, title.trim());

    // 6. Timer durasi
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const endLive = () => {
    Alert.alert('Akhiri Siaran?', 'Penonton tidak bisa lagi menonton siaran ini.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Akhiri', style: 'destructive', onPress: () => {
          clearInterval(timerRef.current);
          socketService.stopStream();
          webrtcService.stopStream();
          socketService.disconnect();
          router.back();
        },
      },
    ]);
  };

  const flipCamera = async () => {
    setFacingFront(f => !f);
    const result = await webrtcService.flipCamera(facingFront ? 'user' : 'environment');
    if (result) streamRef.current = result;
  };

  const sendChat = () => {
    const text = chatText.trim();
    if (!text) return;
    addChatMsg(`👑 ${user?.username ?? 'Host'}`, text, true);
    socketService.sendChat(text);
    setChatText('');
  };

  const copyStreamId = () => {
    const url = `${typeof location !== 'undefined' ? location.origin : ''}/watch?id=${streamId}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        Alert.alert('✅ Tersalin', 'Link siaran sudah disalin ke clipboard!');
      });
    } else {
      Alert.alert('Stream ID', streamId);
    }
  };

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  if (!user) return null;

  // ─── TAMPILAN LIVE ────────────────────────────────────────────────
  if (isLive) {
    return (
      <View style={styles.liveContainer}>
        {/* Container video lokal */}
        <View style={StyleSheet.absoluteFill} nativeID="local-video-container">
          {webrtcService.isSupported() && <LocalVideoElement streamRef={streamRef} />}
        </View>

        {/* Gradient overlay saat kamera belum siap */}
        {!cameraReady && (
          <LinearGradient
            colors={[user.avatarColor + 'AA', '#000']}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Letter avatar jika tidak ada kamera */}
        {!cameraReady && (
          <View style={styles.hostWatermark}>
            <Text style={[styles.watermarkLetter, { color: user.avatarColor }]}>
              {user.username[0]?.toUpperCase()}
            </Text>
            <Text style={styles.cameraStatusText}>
              {cameraError ? cameraError : 'Membuka kamera...'}
            </Text>
          </View>
        )}

        {/* Top HUD */}
        <View style={[styles.liveTopBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.liveStats}>
            <LiveBadge />
            <View style={styles.statChip}>
              <MaterialIcons name="remove-red-eye" size={14} color={Colors.white} />
              <Text style={styles.statChipText}>{formatCount(viewerCount)}</Text>
            </View>
            <View style={styles.statChip}>
              <MaterialIcons name="favorite" size={14} color={Colors.primary} />
              <Text style={styles.statChipText}>{formatCount(likeCount)}</Text>
            </View>
            <View style={styles.statChip}>
              <MaterialIcons name="timer" size={14} color={Colors.white} />
              <Text style={styles.statChipText}>{formatDuration(duration)}</Text>
            </View>
          </View>
          {/* Stream ID */}
          <Pressable onPress={copyStreamId} style={styles.streamIdBox}>
            <Text style={styles.streamIdLabel}>ID</Text>
            <Text style={styles.streamIdVal}>{streamId || '——'}</Text>
            <MaterialIcons name="content-copy" size={14} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Judul */}
        <View style={styles.liveTitleBox}>
          <Text style={styles.liveTitle}>{title}</Text>
          <Text style={styles.liveCategory}>{category}</Text>
        </View>

        {/* Flip kamera */}
        <Pressable onPress={flipCamera} style={[styles.flipBtn, { top: insets.top + 64 }]}>
          <MaterialIcons name="flip-camera-ios" size={22} color={Colors.white} />
        </Pressable>

        {/* Share button */}
        <Pressable onPress={() => setShareVisible(v => !v)} style={[styles.shareBtn, { top: insets.top + 110 }]}>
          <MaterialIcons name="share" size={22} color={Colors.white} />
        </Pressable>

        {/* Share popup */}
        {shareVisible && streamId ? (
          <View style={styles.shareCard}>
            <Text style={styles.shareTitle}>📤 Bagikan ke Penonton</Text>
            <Text style={styles.shareUrl}>
              {typeof location !== 'undefined' ? location.origin : ''}/watch?id={streamId}
            </Text>
            <Pressable onPress={copyStreamId} style={styles.shareCopyBtn}>
              <Text style={styles.shareCopyText}>📋 Salin Link</Text>
            </Pressable>
            <Pressable onPress={() => setShareVisible(false)} style={styles.shareCloseBtn}>
              <Text style={styles.shareCloseText}>Tutup</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Chat area */}
        <View style={[styles.chatAreaLive, { paddingBottom: insets.bottom + 72 }]}>
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            contentContainerStyle={{ gap: 5, paddingBottom: 4 }}
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
        </View>

        {/* Input + End button */}
        <View style={[styles.liveBottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInputLive}
              placeholder="Balas chat penonton..."
              placeholderTextColor={Colors.textMuted}
              value={chatText}
              onChangeText={setChatText}
              onSubmitEditing={sendChat}
              returnKeyType="send"
              maxLength={200}
            />
            <Pressable onPress={sendChat} style={styles.sendBtnLive}>
              <MaterialIcons name="send" size={18} color={Colors.white} />
            </Pressable>
          </View>
          <Pressable onPress={endLive} style={styles.endBtn}>
            <MaterialIcons name="stop" size={20} color={Colors.white} />
            <Text style={styles.endBtnText}>Akhiri Siaran</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── TAMPILAN SETUP ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.setupContainer, { paddingTop: insets.top }]}
        contentContainerStyle={styles.setupContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.setupHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.setupTitle}>Go Live</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Preview avatar */}
        <View style={styles.previewCard}>
          <LinearGradient
            colors={[user.avatarColor + '66', '#111']}
            style={StyleSheet.absoluteFill}
          />
          <Avatar username={user.username} color={user.avatarColor} size={64} fontSize={26} />
          <Text style={styles.previewName}>{user.username}</Text>
          <View style={styles.previewBadge}>
            <MaterialIcons name="videocam" size={14} color={Colors.textSecondary} />
            <Text style={styles.previewReady}>Kamera & mic akan dibuka otomatis</Text>
          </View>
        </View>

        {/* Status server */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="cloud" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Server ngrok aktif — kamera + SimplePeer WebRTC siap untuk siaran P2P
          </Text>
        </View>

        {/* Error jika ada */}
        {cameraError ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={16} color="#FF6B85" />
            <Text style={styles.errorText}>{cameraError}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Judul Siaran *</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Apa yang mau kamu siaran hari ini?"
            placeholderTextColor={Colors.textMuted}
            maxLength={100}
            multiline
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.catChip, category === cat && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>💡 Cara Kerja</Text>
          <Text style={styles.tipsText}>
            • Kamera dibuka otomatis saat tombol ditekan{'\n'}
            • Video P2P via SimplePeer + Socket.io (sangat ringan){'\n'}
            • Penonton bisa nonton, chat, like, emoji rain{'\n'}
            • Bagikan Stream ID ke penonton setelah live
          </Text>
        </View>

        <Pressable
          onPress={startLive}
          style={({ pressed }) => [styles.goLiveBtn, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={[Colors.primary, '#FF6B35']}
            style={styles.goLiveBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialIcons name="videocam" size={22} color={Colors.white} />
            <Text style={styles.goLiveBtnText}>Mulai Siaran Sekarang</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ── Setup ──
  setupContainer: { flex: 1, backgroundColor: Colors.bg },
  setupContent: { paddingBottom: 40 },
  setupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  backBtn: { padding: 4 },
  setupTitle: { color: Colors.white, fontSize: Fonts.lg, fontWeight: '800' },
  previewCard: {
    height: 180, marginHorizontal: Spacing.md, borderRadius: Radius.lg,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  previewName: { color: Colors.white, fontWeight: '700', fontSize: Fonts.md },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewReady: { color: Colors.textSecondary, fontSize: Fonts.sm },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.primaryDim,
    borderRadius: Radius.md, padding: 10,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  infoText: { color: Colors.textSecondary, fontSize: Fonts.sm, flex: 1, lineHeight: 18 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,45,85,0.1)',
    borderRadius: Radius.md, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,45,85,0.3)',
  },
  errorText: { color: '#FF6B85', fontSize: Fonts.sm, flex: 1, lineHeight: 18 },
  field: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  label: {
    color: Colors.textSecondary, fontSize: Fonts.sm, fontWeight: '600',
    marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  titleInput: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, color: Colors.white, fontSize: Fonts.base, lineHeight: 22,
    borderWidth: 1, borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top',
  },
  charCount: { color: Colors.textMuted, fontSize: Fonts.xs, textAlign: 'right', marginTop: 4 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
  catChipText: { color: Colors.textSecondary, fontWeight: '600', fontSize: Fonts.sm },
  catChipTextActive: { color: Colors.primary },
  tipsBox: {
    marginHorizontal: Spacing.md, backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  tipsTitle: { color: Colors.white, fontWeight: '700', marginBottom: 8 },
  tipsText: { color: Colors.textSecondary, fontSize: Fonts.sm, lineHeight: 22 },
  goLiveBtn: { marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  goLiveBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 10,
  },
  goLiveBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.md },

  // ── Live View ──
  liveContainer: { flex: 1, backgroundColor: '#000' },
  hostWatermark: {
    position: 'absolute', alignSelf: 'center', top: '30%',
    alignItems: 'center', gap: 12,
  },
  watermarkLetter: { fontSize: 120, fontWeight: '900', opacity: 0.12 },
  cameraStatusText: { color: 'rgba(255,255,255,0.4)', fontSize: Fonts.sm, textAlign: 'center' },

  liveTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', paddingHorizontal: Spacing.md,
  },
  liveStats: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statChipText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.xs },
  streamIdBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.md,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  streamIdLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700' },
  streamIdVal: { color: Colors.primary, fontWeight: '900', fontSize: 15, letterSpacing: 2 },

  liveTitleBox: { position: 'absolute', top: 108, left: Spacing.md, right: 80 },
  liveTitle: { color: Colors.white, fontSize: Fonts.base, fontWeight: '700' },
  liveCategory: { color: Colors.textSecondary, fontSize: Fonts.xs },

  flipBtn: {
    position: 'absolute', right: Spacing.md,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    position: 'absolute', right: Spacing.md,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  shareCard: {
    position: 'absolute', alignSelf: 'center', top: '30%',
    backgroundColor: 'rgba(10,10,20,0.95)',
    borderRadius: 20, padding: 24, width: '80%', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 20,
  },
  shareTitle: { color: Colors.white, fontWeight: '800', fontSize: Fonts.md, marginBottom: 10 },
  shareUrl: {
    color: Colors.primary, fontSize: Fonts.sm, textAlign: 'center',
    backgroundColor: '#0a0a12', borderRadius: 10, padding: 10,
    marginBottom: 12, width: '100%',
  },
  shareCopyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 24, paddingVertical: 10, marginBottom: 8,
  },
  shareCopyText: { color: Colors.white, fontWeight: '700' },
  shareCloseBtn: { paddingVertical: 8 },
  shareCloseText: { color: Colors.textSecondary, fontSize: Fonts.sm },

  chatAreaLive: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    paddingHorizontal: Spacing.md,
  },
  chatScroll: { maxHeight: 200 },
  msgRow: { flexDirection: 'row' },
  bubble: {
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 5,
    maxWidth: '85%', flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center',
  },
  msgName: { fontSize: Fonts.xs, fontWeight: '700' },
  msgText: { color: Colors.white, fontSize: Fonts.sm, lineHeight: 18 },

  liveBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, gap: 8,
  },
  chatInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  chatInputLive: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 10,
    color: Colors.white, fontSize: Fonts.base,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  sendBtnLive: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#FF3B30',
    borderRadius: Radius.full, paddingVertical: 13,
  },
  endBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.base },
});
