// Powered by OnSpace.AI
// WebRTC Service v2 — menggunakan SimplePeer via Socket.io signaling
// Kompatibel dengan server/server.js yang sudah ada

import { socketService } from './socketioService';

interface RTCCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionChange?: (state: string) => void;
  onError?: (err: string) => void;
}

class WebRTCServiceV2 {
  private localStream: MediaStream | null = null;
  private peers: Map<string, any> = new Map(); // viewerId → SimplePeer
  private role: 'streamer' | 'viewer' | null = null;
  private callbacks: RTCCallbacks = {};

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof RTCPeerConnection !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices
    );
  }

  private async loadSimplePeer(): Promise<any> {
    if ((window as any).SimplePeer) return (window as any).SimplePeer;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js';
      script.onload = () => resolve((window as any).SimplePeer);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ── STREAMER: buka kamera, tunggu viewer join, kirim offer ─────
  async startAsStreamer(callbacks: RTCCallbacks): Promise<MediaStream | null> {
    if (!this.isSupported()) {
      callbacks.onError?.('WebRTC tidak didukung di platform ini');
      return null;
    }
    this.role = 'streamer';
    this.callbacks = callbacks;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      callbacks.onLocalStream?.(this.localStream);

      const SimplePeer = await this.loadSimplePeer();

      // Saat ada viewer baru → buat peer dan kirim offer
      socketService.on('webrtc:viewer-joined', ({ viewerId, viewerName }: any) => {
        const peer = new SimplePeer({
          initiator: true,
          trickle: true,
          stream: this.localStream,
        });

        this.peers.set(viewerId, peer);

        peer.on('signal', (signal: any) => {
          socketService.sendOffer(viewerId, signal);
        });

        peer.on('error', () => this.peers.delete(viewerId));
        peer.on('close', () => this.peers.delete(viewerId));
      });

      // Terima answer dari viewer
      socketService.on('webrtc:answer', ({ viewerId, signal }: any) => {
        const peer = this.peers.get(viewerId);
        if (peer && !peer.destroyed) {
          try { peer.signal(signal); } catch {}
        }
      });

      // ICE candidate dari viewer
      socketService.on('webrtc:ice', ({ from, candidate }: any) => {
        const peer = this.peers.get(from);
        if (peer && !peer.destroyed) {
          try { peer.signal({ candidate }); } catch {}
        }
      });

      // Viewer pergi
      socketService.on('webrtc:viewer-left', ({ viewerId }: any) => {
        const peer = this.peers.get(viewerId);
        if (peer && !peer.destroyed) peer.destroy();
        this.peers.delete(viewerId);
      });

      return this.localStream;
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Izin kamera/mikrofon ditolak. Izinkan di pengaturan browser.'
          : err?.name === 'NotFoundError'
          ? 'Kamera tidak ditemukan.'
          : 'Gagal buka kamera: ' + (err?.message ?? '');
      callbacks.onError?.(msg);
      return null;
    }
  }

  // ── VIEWER: sambung ke stream host ────────────────────────────
  async startAsViewer(callbacks: RTCCallbacks): Promise<void> {
    if (!this.isSupported()) return;
    this.role = 'viewer';
    this.callbacks = callbacks;

    const SimplePeer = await this.loadSimplePeer().catch(() => null);
    if (!SimplePeer) return;

    // Terima offer dari host → buat peer sebagai non-initiator
    socketService.on('webrtc:offer', ({ hostId, signal }: any) => {
      // Jika sudah ada peer untuk host ini, signal saja
      let peer = this.peers.get('host');
      if (!peer || peer.destroyed) {
        peer = new SimplePeer({
          initiator: false,
          trickle: true,
        });
        this.peers.set('host', peer);

        peer.on('signal', (answerSignal: any) => {
          socketService.sendAnswer(hostId, answerSignal);
        });

        peer.on('stream', (stream: MediaStream) => {
          callbacks.onRemoteStream?.(stream);
          callbacks.onConnectionChange?.('connected');
        });

        peer.on('error', (err: any) => {
          callbacks.onConnectionChange?.('failed');
        });

        peer.on('close', () => {
          callbacks.onConnectionChange?.('closed');
        });
      }

      try { peer.signal(signal); } catch {}
    });

    // ICE candidate dari host
    socketService.on('webrtc:ice', ({ from, candidate }: any) => {
      const peer = this.peers.get('host');
      if (peer && !peer.destroyed) {
        try { peer.signal({ candidate }); } catch {}
      }
    });
  }

  stopStream() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.peers.forEach(p => { try { p.destroy(); } catch {} });
    this.peers.clear();
    this.role = null;
  }

  getLocalStream() {
    return this.localStream;
  }

  flipCamera(currentFacing: string): Promise<MediaStream | null> {
    return new Promise(async (resolve) => {
      if (!this.localStream) return resolve(null);
      const newFacing = currentFacing === 'user' ? 'environment' : 'user';
      this.localStream.getVideoTracks().forEach(t => t.stop());
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacing },
          audio: false,
        });
        const newTrack = newStream.getVideoTracks()[0];
        // Replace track di semua peer
        this.peers.forEach(peer => {
          const sender = peer._pc?.getSenders?.()?.find((s: any) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newTrack).catch(() => {});
        });
        // Ganti track di localStream
        const oldTrack = this.localStream!.getVideoTracks()[0];
        if (oldTrack) this.localStream!.removeTrack(oldTrack);
        this.localStream!.addTrack(newTrack);
        this.callbacks.onLocalStream?.(this.localStream!);
        resolve(this.localStream);
      } catch {
        resolve(null);
      }
    });
  }
}

export const webrtcService = new WebRTCServiceV2();
