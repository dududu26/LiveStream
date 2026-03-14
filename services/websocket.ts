// Powered by OnSpace.AI
import { Config } from '@/constants/config';

export type WSMessageType =
  | 'join_room'
  | 'leave_room'
  | 'chat'
  | 'like'
  | 'follow'
  | 'viewer_count'
  | 'room_list'
  | 'stream_start'
  | 'stream_end'
  | 'offer'
  | 'answer'
  | 'ice_candidate'
  | 'error'
  | 'pong';

export interface WSMessage {
  type: WSMessageType;
  roomId?: string;
  userId?: string;
  username?: string;
  avatarColor?: string;
  data?: any;
  timestamp?: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarColor: string;
  text: string;
  timestamp: number;
}

export interface StreamRoom {
  id: string;
  hostId: string;
  hostName: string;
  avatarColor: string;
  title: string;
  viewerCount: number;
  likeCount: number;
  thumbnail?: string;
  startedAt: number;
  category?: string;
}

type MessageHandler = (msg: WSMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<WSMessageType, MessageHandler[]> = new Map();
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private connected = false;
  private userId: string = '';
  private username: string = '';
  private avatarColor: string = '';

  init(userId: string, username: string, avatarColor: string) {
    this.userId = userId;
    this.username = username;
    this.avatarColor = avatarColor;
  }

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(Config.SOCKET_URL);

        this.ws.onopen = () => {
          this.connected = true;
          this.startPing();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const msg: WSMessage = JSON.parse(event.data);
            this.dispatch(msg.type, msg);
          } catch {}
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.stopPing();
          this.scheduleReconnect();
        };

        this.ws.onerror = () => {
          resolve(false);
        };

        setTimeout(() => {
          if (!this.connected) resolve(false);
        }, 5000);
      } catch {
        resolve(false);
      }
    });
  }

  disconnect() {
    this.stopPing();
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  send(msg: Omit<WSMessage, 'userId' | 'username' | 'avatarColor' | 'timestamp'>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...msg,
        userId: this.userId,
        username: this.username,
        avatarColor: this.avatarColor,
        timestamp: Date.now(),
      }));
    }
  }

  on(type: WSMessageType, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    return () => this.off(type, handler);
  }

  off(type: WSMessageType, handler: MessageHandler) {
    const list = this.handlers.get(type) || [];
    this.handlers.set(type, list.filter(h => h !== handler));
  }

  private dispatch(type: WSMessageType, msg: WSMessage) {
    (this.handlers.get(type) || []).forEach(h => h(msg));
  }

  private startPing() {
    this.pingTimer = setInterval(() => {
      this.send({ type: 'pong' } as any);
    }, 25000);
  }

  private stopPing() {
    clearInterval(this.pingTimer);
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  isConnected() {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
