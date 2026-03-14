// Powered by OnSpace.AI
// Mock streams for when server is offline / demo mode
import { StreamRoom } from './websocket';

export const MOCK_STREAMS: StreamRoom[] = [
  {
    id: 'mock-1',
    hostId: 'host-1',
    hostName: 'NeonTiger99',
    avatarColor: '#FF2D55',
    title: '🎮 Gaming Session - Come chill!',
    viewerCount: 1243,
    likeCount: 8920,
    startedAt: Date.now() - 1000 * 60 * 25,
    category: 'Gaming',
  },
  {
    id: 'mock-2',
    hostId: 'host-2',
    hostName: 'WildNova42',
    avatarColor: '#FF6B35',
    title: '🎵 Late night music vibes ✨',
    viewerCount: 876,
    likeCount: 5430,
    startedAt: Date.now() - 1000 * 60 * 12,
    category: 'Music',
  },
  {
    id: 'mock-3',
    hostId: 'host-3',
    hostName: 'BrightSpark11',
    avatarColor: '#007AFF',
    title: '💬 Q&A - Ask me anything!',
    viewerCount: 3201,
    likeCount: 22100,
    startedAt: Date.now() - 1000 * 60 * 5,
    category: 'Talk',
  },
  {
    id: 'mock-4',
    hostId: 'host-4',
    hostName: 'DarkEcho77',
    avatarColor: '#AF52DE',
    title: '🍕 Cooking mukbang tonite',
    viewerCount: 567,
    likeCount: 3310,
    startedAt: Date.now() - 1000 * 60 * 40,
    category: 'Food',
  },
  {
    id: 'mock-5',
    hostId: 'host-5',
    hostName: 'QuickBlaze55',
    avatarColor: '#34C759',
    title: '🏋️ Morning workout with me!',
    viewerCount: 2100,
    likeCount: 15600,
    startedAt: Date.now() - 1000 * 60 * 8,
    category: 'Fitness',
  },
];

export const MOCK_CHAT: { username: string; avatarColor: string; text: string }[] = [
  { username: 'SlickGhost21', avatarColor: '#FF2D55', text: 'yasss lets gooo 🔥' },
  { username: 'PixelDrift08', avatarColor: '#007AFF', text: 'this is so good omg' },
  { username: 'EchoStorm33', avatarColor: '#FFD700', text: '❤️❤️❤️' },
  { username: 'NovaPulse44', avatarColor: '#34C759', text: 'been watching for 20min straight lol' },
  { username: 'BoldTiger66', avatarColor: '#AF52DE', text: 'HI FROM JAKARTA!! 🇮🇩' },
  { username: 'CoolSpark12', avatarColor: '#FF6B35', text: 'follow krn keren bgt 🙌' },
  { username: 'WildEcho99', avatarColor: '#5AC8FA', text: 'gila ini keren parah' },
  { username: 'SharpNova55', avatarColor: '#FF9500', text: '😂😂😂 ngakak' },
  { username: 'FastBlaze00', avatarColor: '#FF2D55', text: 'bagaimana caranya bisa live gini?' },
  { username: 'NeonPixel77', avatarColor: '#007AFF', text: 'udah follow dari tadi 💪' },
];
