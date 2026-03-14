// ⚙️ KONFIGURASI SERVER
// Ganti SOCKET_URL dengan URL ngrok kamu setelah server berjalan
// Contoh: 'wss://abc123.ngrok.io' atau 'ws://192.168.1.x:3001'

export const Config = {
  // URL WebSocket server (ngrok URL kamu)
  SOCKET_URL: 'wss://uncomplaining-aniya-zygophyllaceous.ngrok-free.dev',

  // URL HTTP untuk API signaling WebRTC
  SERVER_URL: 'https://uncomplaining-aniya-zygophyllaceous.ngrok-free.dev',

  // Nama aplikasi
  APP_NAME: 'LiveStream',

  // Maks karakter chat
  MAX_CHAT_LENGTH: 200,

  // Default avatar colors
  AVATAR_COLORS: [
    '#FF2D55', '#FF6B35', '#FFD700',
    '#34C759', '#007AFF', '#AF52DE',
    '#FF9500', '#5AC8FA',
  ],
};

export const EMOJIS = ['❤️', '🔥', '👏', '😂', '😍', '🎉', '💯', '✨', '🙌', '💪'];
