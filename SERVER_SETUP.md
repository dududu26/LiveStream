# 🛠️ Server Setup Guide (UserLand + ngrok)

## Yang Perlu Diinstall di UserLand (Ubuntu/Debian)

### 1. Update & Install Node.js
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # Harus muncul v20.x.x
npm --version
```

### 2. Install ngrok
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | tee /etc/apt/sources.list.d/ngrok.list
apt update && apt install ngrok
```
Atau download manual: https://ngrok.com/download

### 3. Clone repo kamu
```bash
git clone https://github.com/USERNAMU/REPO.git
cd REPO
npm install
```

---

## Buat Server WebSocket (server.js)

Buat file `server.js` di root project kamu:

```javascript
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = 3001;
const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms = new Map();   // roomId -> { room info }
const clients = new Map(); // ws -> { userId, roomId }

function broadcast(data, excludeWs = null) {
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastToRoom(roomId, data, excludeWs = null) {
  wss.clients.forEach(client => {
    const info = clients.get(client);
    if (info?.roomId === roomId && client !== excludeWs && client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  clients.set(ws, {});

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      const info = clients.get(ws) || {};

      switch (msg.type) {
        case 'join_room': {
          info.roomId = msg.roomId;
          info.userId = msg.userId;
          clients.set(ws, info);
          
          const room = rooms.get(msg.roomId);
          if (room) {
            room.viewerCount = (room.viewerCount || 0) + 1;
            broadcastToRoom(msg.roomId, { type: 'viewer_count', roomId: msg.roomId, data: { count: room.viewerCount } });
          }
          break;
        }

        case 'leave_room': {
          const room = rooms.get(info.roomId);
          if (room && room.viewerCount > 0) {
            room.viewerCount--;
            broadcastToRoom(info.roomId, { type: 'viewer_count', roomId: info.roomId, data: { count: room.viewerCount } });
          }
          info.roomId = null;
          clients.set(ws, info);
          break;
        }

        case 'chat': {
          broadcastToRoom(info.roomId, {
            type: 'chat',
            roomId: info.roomId,
            userId: msg.userId,
            username: msg.username,
            avatarColor: msg.avatarColor,
            data: msg.data,
            timestamp: Date.now(),
          }, ws);
          break;
        }

        case 'like': {
          broadcastToRoom(info.roomId, {
            type: 'like',
            roomId: info.roomId,
            data: msg.data,
          }, ws);
          break;
        }

        case 'room_list': {
          ws.send(JSON.stringify({
            type: 'room_list',
            data: { rooms: Array.from(rooms.values()) },
          }));
          break;
        }

        case 'stream_start': {
          const room = { ...msg.data.room, viewerCount: 0 };
          rooms.set(room.id, room);
          broadcast({ type: 'stream_start', data: { room } });
          break;
        }

        case 'stream_end': {
          rooms.delete(msg.roomId);
          broadcast({ type: 'stream_end', roomId: msg.roomId });
          break;
        }

        // WebRTC Signaling
        case 'offer':
        case 'answer':
        case 'ice_candidate': {
          broadcastToRoom(info.roomId, msg, ws);
          break;
        }
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info?.roomId) {
      const room = rooms.get(info.roomId);
      if (room && room.viewerCount > 0) room.viewerCount--;
    }
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
});
```

---

## Cara Jalankan

### Terminal 1 — Server WebSocket
```bash
node server.js
```

### Terminal 2 — ngrok tunnel
```bash
# Daftar akun ngrok gratis di https://ngrok.com
# Lalu auth:
ngrok config add-authtoken YOUR_NGROK_TOKEN

# Tunnel port 3001
ngrok http 3001
```

Setelah ngrok jalan, kamu akan dapat URL seperti:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3001
```

### Terminal 3 — Expo App (Web)
```bash
npx expo start --web
```

Atau untuk mobile (harus install Expo Go):
```bash
npx expo start
```

---

## Set URL ngrok ke App

Edit file `constants/config.ts`:
```typescript
SOCKET_URL: 'wss://abc123.ngrok-free.app',  // ← ganti dengan URL ngrok kamu
```

> Gunakan `wss://` untuk HTTPS tunnel ngrok, `ws://` untuk localhost.

---

## API Keys

Tidak ada API key pihak ketiga yang dibutuhkan!
- WebSocket server = server Node.js kamu sendiri
- ngrok = akun gratis di ngrok.com
- Tidak ada Supabase, Firebase, dsb.

---

## Install Package Node.js untuk server.js
```bash
npm install ws
# (ws sudah built-in di node, tapi install untuk safety)
```

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| `ECONNREFUSED` | Server belum jalan, jalankan `node server.js` |
| `ws://` tidak connect | Gunakan `wss://` jika pakai ngrok HTTPS |
| App tidak real-time | Cek URL di `constants/config.ts` |
| Port sudah dipakai | `lsof -i :3001` lalu kill PID-nya |
