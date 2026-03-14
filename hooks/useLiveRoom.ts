// Powered by OnSpace.AI
import { useState, useEffect, useRef, useCallback } from 'react';
import { wsService, ChatMessage, StreamRoom } from '@/services/websocket';
import { MOCK_CHAT } from '@/services/mockStreams';

let chatIdCounter = 0;
function genId() {
  return `msg-${Date.now()}-${chatIdCounter++}`;
}

export function useLiveRoom(roomId: string, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const mockTimerRef = useRef<any>(null);
  const isMockMode = useRef(false);

  const startMockChat = useCallback(() => {
    isMockMode.current = true;
    let idx = 0;
    const addMock = () => {
      const item = MOCK_CHAT[idx % MOCK_CHAT.length];
      idx++;
      const msg: ChatMessage = {
        id: genId(),
        userId: `mock-${idx}`,
        username: item.username,
        avatarColor: item.avatarColor,
        text: item.text,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev.slice(-60), msg]);
      const delay = 1500 + Math.random() * 3000;
      mockTimerRef.current = setTimeout(addMock, delay);
    };
    mockTimerRef.current = setTimeout(addMock, 1000);
    setViewerCount(Math.floor(Math.random() * 2000) + 200);
    setLikeCount(Math.floor(Math.random() * 10000) + 1000);
  }, []);

  useEffect(() => {
    if (!roomId || !userId) return;

    const tryConnect = async () => {
      const ok = await wsService.connect();
      if (ok) {
        setConnected(true);
        wsService.send({ type: 'join_room', roomId });
      } else {
        startMockChat();
      }
    };

    tryConnect();

    const unsubChat = wsService.on('chat', (msg) => {
      const chat: ChatMessage = {
        id: genId(),
        userId: msg.userId!,
        username: msg.username!,
        avatarColor: msg.avatarColor!,
        text: msg.data?.text ?? '',
        timestamp: msg.timestamp!,
      };
      setMessages(prev => [...prev.slice(-60), chat]);
    });

    const unsubViewers = wsService.on('viewer_count', (msg) => {
      setViewerCount(msg.data?.count ?? 0);
    });

    const unsubLike = wsService.on('like', (msg) => {
      setLikeCount(prev => prev + (msg.data?.count ?? 1));
    });

    return () => {
      unsubChat();
      unsubViewers();
      unsubLike();
      clearTimeout(mockTimerRef.current);
      if (!isMockMode.current) {
        wsService.send({ type: 'leave_room', roomId });
      }
    };
  }, [roomId, userId]);

  const sendMessage = useCallback((text: string, username: string, avatarColor: string) => {
    const msg: ChatMessage = {
      id: genId(),
      userId,
      username,
      avatarColor,
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev.slice(-60), msg]);

    if (wsService.isConnected()) {
      wsService.send({ type: 'chat', roomId, data: { text } });
    }
  }, [roomId, userId]);

  const sendLike = useCallback((count: number = 1) => {
    setLikeCount(prev => prev + count);
    if (wsService.isConnected()) {
      wsService.send({ type: 'like', roomId, data: { count } });
    }
  }, [roomId]);

  return { messages, viewerCount, likeCount, connected, sendMessage, sendLike };
}
