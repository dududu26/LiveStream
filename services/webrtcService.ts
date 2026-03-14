// Powered by OnSpace.AI
// WebRTC Service: mengelola peer connection untuk siaran video live
// - Streamer: ambil kamera → kirim offer ke server → terima answer dari penonton
// - Viewer: terima offer dari streamer → kirim answer → tampilkan video
import { wsService } from './websocket';

export type RTCRole = 'streamer' | 'viewer';

interface RTCCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionChange?: (state: RTCPeerConnectionState) => void;
  onError?: (err: string) => void;
}

class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private role: RTCRole = 'viewer';
  private roomId: string = '';
  private callbacks: RTCCallbacks = {};

  // ICE server config (STUN publik Google, cukup untuk jaringan LAN/ngrok)
  private iceConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      typeof RTCPeerConnection !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined';
  }

  async startAsStreamer(
    roomId: string,
    callbacks: RTCCallbacks
  ): Promise<MediaStream | null> {
    if (!this.isSupported()) {
      callbacks.onError?.('WebRTC tidak didukung di platform ini');
      return null;
    }

    this.role = 'streamer';
    this.roomId = roomId;
    this.callbacks = callbacks;

    try {
      // 1. Ambil stream kamera + mikrofon
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true,
      });
      callbacks.onLocalStream?.(this.localStream);

      // 2. Buat peer connection
      this.createPeerConnection();

      // 3. Tambah track kamera ke peer connection
      this.localStream.getTracks().forEach(track => {
        this.pc!.addTrack(track, this.localStream!);
      });

      // 4. Dengarkan offer request dari viewer via WebSocket
      wsService.on('offer_request', async (msg) => {
        if (msg.roomId !== roomId) return;
        await this.createAndSendOffer(msg.userId!);
      });

      // 5. Dengarkan answer dari viewer
      wsService.on('answer', async (msg) => {
        if (msg.roomId !== roomId) return;
        try {
          await this.pc!.setRemoteDescription(
            new RTCSessionDescription(msg.data.sdp)
          );
        } catch (e) {}
      });

      // 6. Dengarkan ICE candidate dari viewer
      wsService.on('ice_candidate', async (msg) => {
        if (msg.roomId !== roomId) return;
        try {
          await this.pc!.addIceCandidate(new RTCIceCandidate(msg.data.candidate));
        } catch (e) {}
      });

      return this.localStream;
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Izin kamera/mikrofon ditolak. Buka pengaturan browser dan izinkan akses.'
        : err?.name === 'NotFoundError'
        ? 'Kamera tidak ditemukan di perangkat ini.'
        : 'Gagal membuka kamera: ' + (err?.message ?? 'Unknown error');
      callbacks.onError?.(msg);
      return null;
    }
  }

  async startAsViewer(
    roomId: string,
    hostId: string,
    callbacks: RTCCallbacks
  ): Promise<void> {
    if (!this.isSupported()) return;

    this.role = 'viewer';
    this.roomId = roomId;
    this.callbacks = callbacks;

    this.createPeerConnection();

    // Dengarkan offer dari streamer
    wsService.on('offer', async (msg) => {
      if (msg.roomId !== roomId) return;
      try {
        await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        wsService.send({
          type: 'answer',
          roomId,
          data: { sdp: answer, targetId: msg.userId },
        });
      } catch (e) {}
    });

    // Dengarkan ICE candidate dari streamer
    wsService.on('ice_candidate', async (msg) => {
      if (msg.roomId !== roomId) return;
      try {
        await this.pc!.addIceCandidate(new RTCIceCandidate(msg.data.candidate));
      } catch (e) {}
    });

    // Minta offer dari streamer
    wsService.send({
      type: 'offer_request',
      roomId,
      data: { hostId },
    } as any);
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection(this.iceConfig);

    // Terima remote stream (untuk viewer)
    this.pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        this.callbacks.onRemoteStream?.(event.streams[0]);
      }
    };

    // Kirim ICE candidate ke peer lain via WebSocket
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsService.send({
          type: 'ice_candidate',
          roomId: this.roomId,
          data: { candidate: event.candidate },
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionChange?.(this.pc!.connectionState);
    };
  }

  private async createAndSendOffer(targetUserId: string) {
    try {
      const offer = await this.pc!.createOffer({
        offerToReceiveVideo: false, // Streamer tidak terima video balik
        offerToReceiveAudio: false,
      });
      await this.pc!.setLocalDescription(offer);
      wsService.send({
        type: 'offer',
        roomId: this.roomId,
        data: { sdp: offer, targetId: targetUserId },
      });
    } catch (e) {}
  }

  stopStream() {
    // Hentikan semua track kamera/mikrofon
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
  }

  getLocalStream() {
    return this.localStream;
  }
}

export const webrtcService = new WebRTCService();
