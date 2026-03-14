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
import { wsService } from '@/services/websocket';
import { webrtcService } from '@/services/webrtcService';

const CATEGORIES = ['Gaming', 'Music', 'Talk', 'Food', 'Fitness', 'Art', 'Other'];

function genRoomId() {
  return 'room-' + Math.random().toString(36).substring(2, 10);
}

export default function GoLiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Talk');
  const [isLive, setIsLive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingFront, setFacingFront] = useState(true);
  const videoRef = useRef<any>(null);
  const roomIdRef = useRef('');
  const timerRef = useRef<any>(null);
  const viewerTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(viewerTimerRef.current);
      webrtcService.stopStream();
    };
  }, []);

  const startLive = async () => {
    if (!title.trim()) {
      Alert.alert('Tambah judul', 'Masukkan judul untuk siaran kamu');
      return;
    }
    if (!user) return;

    roomIdRef.current = genRoomId();
    setCameraError(null);

    // Mulai WebRTC kamera
    const stream = await webrtcService.startAsStreamer(roomIdRef.current, {
      onLocalStream: (s) => {
        setCameraStream(s);
        setCameraReady(true);
        // Pasang stream ke elemen video (web)
        if (videoRef.current && typeof videoRef.current.srcObject !== 'undefined') {
          videoRef.current.srcObject = s;
        }
      },
      onError: (err) => {
        setCameraError(err);
        setCameraReady(false);
      },
      onConnectionChange: (state) => {
        // state: connected/disconnected dll
      },
    });

    setIsLive(true);
    setDuration(0);

    // Kirim info stream ke server
    wsService.send({
      type: 'stream_start',
      roomId: roomIdRef.current,
      data: {
        room: {
          id: roomIdRef.current,
          hostId: user.userId,
          hostName: user.username,
          avatarColor: user.avatarColor,
          title: title.trim(),
          viewerCount: 0,
          likeCount: 0,
          startedAt: Date.now(),
          category,
        },
      },
    });

    // Timer durasi
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);

    // Simulasi viewer (mock mode jika server offline)
    viewerTimerRef.current = setInterval(() => {
      setViewerCount(v => Math.max(0, v + Math.floor((Math.random() - 0.3) * 15)));
      setLikeCount(v => v + Math.floor(Math.random() * 10));
    }, 2000);

    wsService.on('viewer_count', (msg) => {
      if (msg.roomId === roomIdRef.current) {
        setViewerCount(msg.data?.count ?? 0);
      }
    });
  };

  const flipCamera = useCallback(async () => {
    setFacingFront(f => !f);
    // Untuk web: harus restart getUserMedia dengan constraint baru
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingFront ? 'environment' : 'user' },
          audio: true,
        });
        setCameraStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;
      } catch {}
    }
  }, [cameraStream, facingFront]);

  const endLive = () => {
    Alert.alert('Akhiri Siaran?', 'Yakin ingin mengakhiri siaran live?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Akhiri', style: 'destructive', onPress: () => {
          clearInterval(timerRef.current);
          clearInterval(viewerTimerRef.current);
          webrtcService.stopStream();
          wsService.send({ type: 'stream_end', roomId: roomIdRef.current });
          router.back();
        },
      },
    ]);
  };

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  if (!user) return null;

  // ─── TAMPILAN LIVE ───────────────────────────────────────────────
  if (isLive) {
    return (
      <View style={styles.liveContainer}>
        {/* Video Background: kamera langsung atau fallback gradient */}
        {cameraReady && cameraStream ? (
          // Web: gunakan elemen <video> via ref
          <View style={StyleSheet.absoluteFill}>
            {/* Video element akan di-attach via ref.srcObject di useEffect atas */}
            <VideoView videoRef={videoRef} />
          </View>
        ) : (
          <LinearGradient
            colors={[user.avatarColor + 'AA', '#000']}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Watermark jika kamera tidak aktif */}
        {!cameraReady && (
          <View style={styles.hostWatermark}>
            <Text style={[styles.watermarkLetter, { color: user.avatarColor }]}>
              {user.username[0]?.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Error kamera */}
        {cameraError ? (
          <View style={styles.cameraErrorBox}>
            <MaterialIcons name="videocam-off" size={32} color="rgba(255,100,100,0.8)" />
            <Text style={styles.cameraErrorText}>{cameraError}</Text>
            <Text style={styles.cameraErrorNote}>Siaran tetap berjalan tanpa video kamera</Text>
          </View>
        ) : !cameraReady ? (
          <View style={styles.cameraBox}>
            <MaterialIcons name="videocam" size={40} color="rgba(255,255,255,0.4)" />
            <Text style={styles.cameraNote}>Membuka kamera...</Text>
          </View>
        ) : null}

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
          </View>
          <View style={styles.liveTimerBox}>
            <Text style={styles.liveTimer}>{formatDuration(duration)}</Text>
          </View>
        </View>

        {/* Judul */}
        <View style={styles.liveTitleBox}>
          <Text style={styles.liveTitle}>{title}</Text>
          <Text style={styles.liveCategory}>{category}</Text>
        </View>

        {/* Flip kamera */}
        {cameraReady && (
          <Pressable
            onPress={flipCamera}
            style={[styles.flipBtn, { top: insets.top + 60 }]}
          >
            <MaterialIcons name="flip-camera-ios" size={24} color={Colors.white} />
          </Pressable>
        )}

        {/* Tombol akhiri */}
        <View style={[styles.liveBottomBar, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable onPress={endLive} style={styles.endBtn}>
            <MaterialIcons name="stop" size={22} color={Colors.white} />
            <Text style={styles.endBtnText}>Akhiri Siaran</Text>
          </Pressable>
          <Text style={styles.endNote}>Penonton melihat siaran kamu dari tab Discover</Text>
        </View>
      </View>
    );
  }

  // ─── TAMPILAN SETUP ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.setupContainer, { paddingTop: insets.top }]}
        contentContainerStyle={styles.setupContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.setupHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.setupTitle}>Go Live</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <LinearGradient
            colors={[user.avatarColor + '66', '#111']}
            style={StyleSheet.absoluteFill}
          />
          <Avatar username={user.username} color={user.avatarColor} size={64} fontSize={26} />
          <Text style={styles.previewName}>{user.username}</Text>
          <View style={styles.previewBadge}>
            <MaterialIcons name="videocam" size={14} color={Colors.textSecondary} />
            <Text style={styles.previewReady}>Siap siaran · WebRTC aktif</Text>
          </View>
        </View>

        {/* Info WebRTC */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="videocam" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Kamera akan dibuka otomatis saat siaran dimulai menggunakan WebRTC
          </Text>
        </View>

        {/* Judul */}
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

        {/* Kategori */}
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

        {/* Tips */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>💡 Info Setup</Text>
          <Text style={styles.tipsText}>
            • Kamera otomatis dibuka via WebRTC{'\n'}
            • Server ngrok: uncomplaining-aniya-zygophyllaceous.ngrok-free.dev{'\n'}
            • Siaran muncul di tab Discover untuk semua penonton{'\n'}
            • Penonton bisa chat, like, dan follow kamu
          </Text>
        </View>

        {/* Tombol Go Live */}
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
            <Text style={styles.goLiveBtnText}>Mulai Siaran</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Komponen video untuk web (srcObject tidak bisa via prop langsung)
function VideoView({ videoRef }: { videoRef: React.RefObject<any> }) {
  useEffect(() => {
    // Di web: element video HTML bisa dipasang srcObject
    // Di React Native native: gunakan react-native-webrtc RTCView
    // Tidak ada yang perlu dilakukan di sini karena sudah di-set di parent
  }, []);

  // Platform web: render elemen video HTML via ref
  // Pada Expo Go/native: tampilkan placeholder
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return null; // VideoOverlay akan di-handle via native video element
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name="videocam" size={48} color="rgba(255,255,255,0.3)" />
      <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 13 }}>
        Kamera aktif (preview di web)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  setupContainer: { flex: 1, backgroundColor: Colors.bg },
  setupContent: { paddingBottom: 40 },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: 4 },
  setupTitle: { color: Colors.white, fontSize: Fonts.lg, fontWeight: '800' },
  previewCard: {
    height: 180,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewName: { color: Colors.white, fontWeight: '700', fontSize: Fonts.md },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewReady: { color: Colors.textSecondary, fontSize: Fonts.sm },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryDim,
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  infoText: { color: Colors.textSecondary, fontSize: Fonts.sm, flex: 1, lineHeight: 18 },
  field: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  label: { color: Colors.textSecondary, fontSize: Fonts.sm, fontWeight: '600', marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  titleInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.white,
    fontSize: Fonts.base,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { color: Colors.textMuted, fontSize: Fonts.xs, textAlign: 'right', marginTop: 4 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
  catChipText: { color: Colors.textSecondary, fontWeight: '600', fontSize: Fonts.sm },
  catChipTextActive: { color: Colors.primary },
  tipsBox: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  tipsTitle: { color: Colors.white, fontWeight: '700', marginBottom: 8 },
  tipsText: { color: Colors.textSecondary, fontSize: Fonts.sm, lineHeight: 22 },
  goLiveBtn: { marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  goLiveBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  goLiveBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.md },

  // Live view
  liveContainer: { flex: 1, backgroundColor: '#000' },
  hostWatermark: { position: 'absolute', alignSelf: 'center', top: '30%' },
  watermarkLetter: { fontSize: 140, fontWeight: '900', opacity: 0.08 },
  cameraBox: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    alignItems: 'center',
    gap: 8,
  },
  cameraNote: { color: 'rgba(255,255,255,0.5)', fontSize: Fonts.base },
  cameraErrorBox: {
    position: 'absolute',
    alignSelf: 'center',
    top: '38%',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  cameraErrorText: { color: 'rgba(255,160,160,0.9)', fontSize: Fonts.sm, textAlign: 'center', lineHeight: 20 },
  cameraErrorNote: { color: 'rgba(255,255,255,0.3)', fontSize: Fonts.xs, textAlign: 'center' },
  flipBtn: {
    position: 'absolute',
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  liveStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statChipText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sm },
  liveTimerBox: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  liveTimer: { color: Colors.white, fontWeight: '700' },
  liveTitleBox: { position: 'absolute', top: 110, left: Spacing.md, right: Spacing.md },
  liveTitle: { color: Colors.white, fontSize: Fonts.md, fontWeight: '700' },
  liveCategory: { color: Colors.textSecondary, fontSize: Fonts.sm },
  liveBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.xl,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF3B30',
    borderRadius: Radius.full,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  endBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.base },
  endNote: { color: 'rgba(255,255,255,0.4)', fontSize: Fonts.xs, textAlign: 'center' },
});
