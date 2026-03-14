/**
 * LiveStream Server — Socket.io + Simple-Peer (P2P via signaling)
 * Port: 8226
 * Jalankan: node server.js
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 8226;

// ─── Static Files ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── In-Memory Store ─────────────────────────────────────────────
/**
 * streams: Map<streamId, StreamInfo>
 * StreamInfo {
 *   id, hostSocketId, hostName, title, startedAt,
 *   viewers: Map<socketId, { name }>
 *   likeCount, chatCount
 * }
 */
const streams = new Map();

// ─── Routes ──────────────────────────────────────────────────────

// Halaman host
app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

// Halaman watch (dengan ?id=STREAM_ID)
app.get('/watch', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'watch.html'));
});

// API: daftar stream aktif
app.get('/api/streams', (req, res) => {
  const list = [];
  for (const [id, s] of streams) {
    list.push({
      id: s.id,
      hostName: s.hostName,
      title: s.title,
      startedAt: s.startedAt,
      viewerCount: s.viewers.size,
      likeCount: s.likeCount,
    });
  }
  res.json(list);
});

// ─── Socket.io Logic ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Terhubung: ${socket.id}`);

  // ── HOST: mulai siaran ─────────────────────────────────────────
  socket.on('host:start', ({ title, hostName }) => {
    const streamId = uuidv4().split('-')[0].toUpperCase(); // 8 karakter, mudah dibagi
    const stream = {
      id: streamId,
      hostSocketId: socket.id,
      hostName: hostName || 'Host',
      title: title || 'Live Stream',
      startedAt: Date.now(),
      viewers: new Map(),
      likeCount: 0,
      chatCount: 0,
    };
    streams.set(streamId, stream);
    socket.join(`room:${streamId}`);
    socket.data.streamId = streamId;
    socket.data.role = 'host';

    socket.emit('host:started', { streamId });
    console.log(`[LIVE] ${hostName} mulai siaran — ID: ${streamId}`);

    // Update stream list ke semua
    broadcastStreamList();
  });

  // ── HOST: akhiri siaran ────────────────────────────────────────
  socket.on('host:stop', () => {
    const streamId = socket.data.streamId;
    if (!streamId) return;
    endStream(streamId, socket);
  });

  // ── VIEWER: bergabung ke room ──────────────────────────────────
  socket.on('viewer:join', ({ streamId, viewerName }) => {
    const stream = streams.get(streamId);
    if (!stream) {
      socket.emit('error', { message: 'Stream tidak ditemukan atau sudah berakhir.' });
      return;
    }

    const name = viewerName || `Anon${Math.floor(Math.random() * 9000) + 1000}`;
    stream.viewers.set(socket.id, { name });
    socket.join(`room:${streamId}`);
    socket.data.streamId = streamId;
    socket.data.viewerName = name;
    socket.data.role = 'viewer';

    // Kirim info stream ke viewer
    socket.emit('viewer:joined', {
      streamId,
      hostName: stream.hostName,
      title: stream.title,
      startedAt: stream.startedAt,
      viewerName: name,
    });

    // Notif ke semua di room
    broadcastViewerCount(streamId);
    io.to(`room:${streamId}`).emit('chat:system', {
      text: `${name} bergabung 👋`,
      timestamp: Date.now(),
    });

    // Minta host kirim WebRTC offer ke viewer baru ini
    socket.to(stream.hostSocketId).emit('webrtc:viewer-joined', {
      viewerId: socket.id,
      viewerName: name,
    });

    console.log(`[JOIN] ${name} nonton stream ${streamId}`);
  });

  // ── WebRTC Signaling (P2P via server relay) ────────────────────

  // Host kirim offer ke viewer spesifik
  socket.on('webrtc:offer', ({ targetId, signal }) => {
    io.to(targetId).emit('webrtc:offer', {
      hostId: socket.id,
      signal,
    });
  });

  // Viewer kirim answer balik ke host
  socket.on('webrtc:answer', ({ targetId, signal }) => {
    io.to(targetId).emit('webrtc:answer', {
      viewerId: socket.id,
      signal,
    });
  });

  // ICE candidate relay (dua arah)
  socket.on('webrtc:ice', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc:ice', {
      from: socket.id,
      candidate,
    });
  });

  // ── Chat ───────────────────────────────────────────────────────
  socket.on('chat:send', ({ text }) => {
    const streamId = socket.data.streamId;
    if (!streamId || !text?.trim()) return;
    const stream = streams.get(streamId);
    if (!stream) return;

    const name = socket.data.role === 'host'
      ? `👑 ${stream.hostName}`
      : (socket.data.viewerName || 'Anon');

    stream.chatCount++;

    const msg = {
      id: stream.chatCount,
      name,
      text: text.trim().substring(0, 200),
      timestamp: Date.now(),
      isHost: socket.data.role === 'host',
    };

    io.to(`room:${streamId}`).emit('chat:message', msg);
  });

  // ── Like ───────────────────────────────────────────────────────
  socket.on('like:send', ({ count = 1 }) => {
    const streamId = socket.data.streamId;
    if (!streamId) return;
    const stream = streams.get(streamId);
    if (!stream) return;

    stream.likeCount += count;
    io.to(`room:${streamId}`).emit('like:update', { total: stream.likeCount });
  });

  // ── Emoji Rain ─────────────────────────────────────────────────
  socket.on('emoji:send', ({ emoji }) => {
    const streamId = socket.data.streamId;
    if (!streamId) return;
    // Broadcast ke semua penonton di room kecuali pengirim
    socket.to(`room:${streamId}`).emit('emoji:rain', { emoji });
  });

  // ── Disconnect ─────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const streamId = socket.data.streamId;
    if (!streamId) return;

    if (socket.data.role === 'host') {
      // Host disconnect → akhiri stream
      endStream(streamId, socket);
    } else if (socket.data.role === 'viewer') {
      const stream = streams.get(streamId);
      if (stream) {
        stream.viewers.delete(socket.id);
        broadcastViewerCount(streamId);
        // Beritahu host bahwa viewer pergi (untuk cleanup WebRTC)
        io.to(stream.hostSocketId).emit('webrtc:viewer-left', {
          viewerId: socket.id,
        });
      }
    }
    console.log(`[-] Putus: ${socket.id}`);
  });
});

// ─── Helper Functions ─────────────────────────────────────────────
function endStream(streamId, socket) {
  const stream = streams.get(streamId);
  if (!stream) return;
  // Beritahu semua viewer bahwa stream berakhir
  io.to(`room:${streamId}`).emit('stream:ended', {
    message: 'Siaran telah berakhir.',
    duration: Math.floor((Date.now() - stream.startedAt) / 1000),
    likeCount: stream.likeCount,
  });
  streams.delete(streamId);
  broadcastStreamList();
  console.log(`[END] Stream ${streamId} berakhir`);
}

function broadcastViewerCount(streamId) {
  const stream = streams.get(streamId);
  if (!stream) return;
  io.to(`room:${streamId}`).emit('viewer:count', {
    count: stream.viewers.size,
  });
}

function broadcastStreamList() {
  const list = [];
  for (const [id, s] of streams) {
    list.push({
      id: s.id,
      hostName: s.hostName,
      title: s.title,
      startedAt: s.startedAt,
      viewerCount: s.viewers.size,
      likeCount: s.likeCount,
    });
  }
  io.emit('streams:list', list);
}

// ─── Start Server ─────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log(`║  LiveStream Server aktif di port ${PORT} ║`);
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Host  → http://localhost:${PORT}/host  ║`);
  console.log(`║  Watch → http://localhost:${PORT}/watch ║`);
  console.log(`║  API   → http://localhost:${PORT}/api/streams ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});
