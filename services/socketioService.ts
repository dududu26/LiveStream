// Powered by OnSpace.AI
// Socket.io client service — kompatibel dengan server Socket.io di server/server.js
// Menggantikan wsService untuk real-time chat, like, viewer count

import { Config } from '@/constants/config';
import { ChatMessage } from './websocket';

type Handler = (data: any) => void;

class SocketIOService {
  private socket: any = null;
  private handlers: Map<string, Handler[]> = new Map();
  private connected = false;
  private streamId: string = '';
  private viewerName: string = '';
  private role: 'host' | 'viewer' | null = null;

  /**
   * Load socket.io-client dari CDN (hanya web)
   */
  private async loadIO(): Promise<any> {
    if (typeof window === 'undefined') return null;
    // Sudah ada via script tag di web? Coba ambil dari window
    if ((window as any).io) return (window as any).io;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
      script.onload = () => resolve((window as any).io);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async connect(): Promise<boolean> {
    if (this.socket?.connected) return true;
    try {
      const io = await this.loadIO();
      if (!io) return false;

      this.socket = io(Config.SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: 8000,
        reconnection: true,
        reconnectionDelay: 2000,
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 8000);

        this.socket.on('connect', () => {
          this.connected = true;
          clearTimeout(timeout);
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          this.connected = false;
        });

        this.socket.on('connect_error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        // Forward semua event server ke handlers
        const events = [
          'host:started', 'viewer:joined', 'viewer:count',
          'like:update', 'chat:message', 'chat:system',
          'stream:ended', 'error',
          'webrtc:offer', 'webrtc:answer', 'webrtc:ice',
          'webrtc:viewer-joined', 'webrtc:viewer-left',
          'emoji:rain', 'streams:list',
        ];
        events.forEach(ev => {
          this.socket.on(ev, (data: any) => this.dispatch(ev, data));
        });
      });
    } catch {
      return false;
    }
  }

  // ─── Host API ──────────────────────────────────────────────────
  startStream(hostName: string, title: string) {
    this.role = 'host';
    this.socket?.emit('host:start', { hostName, title });
  }

  stopStream() {
    this.socket?.emit('host:stop');
  }

  // ─── Viewer API ────────────────────────────────────────────────
  joinStream(streamId: string, viewerName: string) {
    this.role = 'viewer';
    this.streamId = streamId;
    this.viewerName = viewerName;
    this.socket?.emit('viewer:join', { streamId, viewerName });
  }

  // ─── Chat ──────────────────────────────────────────────────────
  sendChat(text: string) {
    this.socket?.emit('chat:send', { text });
  }

  // ─── Like ──────────────────────────────────────────────────────
  sendLike(count = 1) {
    this.socket?.emit('like:send', { count });
  }

  // ─── Emoji ─────────────────────────────────────────────────────
  sendEmoji(emoji: string) {
    this.socket?.emit('emoji:send', { emoji });
  }

  // ─── WebRTC Signaling ─────────────────────────────────────────
  sendOffer(targetId: string, signal: any) {
    this.socket?.emit('webrtc:offer', { targetId, signal });
  }

  sendAnswer(targetId: string, signal: any) {
    this.socket?.emit('webrtc:answer', { targetId, signal });
  }

  sendIce(targetId: string, candidate: any) {
    this.socket?.emit('webrtc:ice', { targetId, candidate });
  }

  // ─── Event System ─────────────────────────────────────────────
  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => {
      const list = this.handlers.get(event) || [];
      this.handlers.set(event, list.filter(h => h !== handler));
    };
  }

  private dispatch(event: string, data: any) {
    (this.handlers.get(event) || []).forEach(h => h(data));
  }

  isConnected() {
    return this.socket?.connected === true;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
  }

  getSocketId(): string {
    return this.socket?.id ?? '';
  }
}

export const socketService = new SocketIOService();
