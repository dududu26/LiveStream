// Powered by OnSpace.AI
import { useState, useEffect } from 'react';
import { StreamRoom, wsService } from '@/services/websocket';
import { MOCK_STREAMS } from '@/services/mockStreams';

export function useStreams() {
  const [streams, setStreams] = useState<StreamRoom[]>(MOCK_STREAMS);
  const [loading, setLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);

  useEffect(() => {
    const tryConnect = async () => {
      setLoading(true);
      const ok = await wsService.connect();
      setServerConnected(ok);
      if (ok) {
        wsService.send({ type: 'room_list' } as any);
      } else {
        // Use mock data with simulated viewer updates
        setStreams(MOCK_STREAMS);
      }
      setLoading(false);
    };

    tryConnect();

    const unsub = wsService.on('room_list', (msg) => {
      if (msg.data?.rooms?.length > 0) {
        setStreams(msg.data.rooms);
      }
    });

    const unsubStart = wsService.on('stream_start', (msg) => {
      if (msg.data?.room) {
        setStreams(prev => [msg.data.room, ...prev]);
      }
    });

    const unsubEnd = wsService.on('stream_end', (msg) => {
      setStreams(prev => prev.filter(s => s.id !== msg.roomId));
    });

    // Simulate viewer count changes in mock mode
    const interval = setInterval(() => {
      if (!serverConnected) {
        setStreams(prev =>
          prev.map(s => ({
            ...s,
            viewerCount: Math.max(10, s.viewerCount + Math.floor((Math.random() - 0.4) * 50)),
          }))
        );
      }
    }, 5000);

    return () => {
      unsub();
      unsubStart();
      unsubEnd();
      clearInterval(interval);
    };
  }, []);

  const addMyStream = (room: StreamRoom) => {
    setStreams(prev => [room, ...prev]);
  };

  const removeMyStream = (roomId: string) => {
    setStreams(prev => prev.filter(s => s.id !== roomId));
  };

  return { streams, loading, serverConnected, addMyStream, removeMyStream };
}
