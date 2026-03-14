// Powered by OnSpace.AI
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/config';

const ADJECTIVES = ['Fast', 'Cool', 'Wild', 'Bright', 'Neon', 'Dark', 'Bold', 'Sharp', 'Quick', 'Slick'];
const NOUNS = ['Tiger', 'Storm', 'Spark', 'Nova', 'Blaze', 'Ghost', 'Echo', 'Pixel', 'Drift', 'Pulse'];

function randomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 99);
  return `${adj}${noun}${num}`;
}

function randomColor() {
  return Config.AVATAR_COLORS[Math.floor(Math.random() * Config.AVATAR_COLORS.length)];
}

function randomId() {
  return Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

export interface UserProfile {
  userId: string;
  username: string;
  avatarColor: string;
  following: string[]; // hostIds
  createdAt: number;
}

export const userService = {
  async getOrCreate(): Promise<UserProfile> {
    try {
      const stored = await AsyncStorage.getItem('@live_user_profile');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}

    const profile: UserProfile = {
      userId: randomId(),
      username: randomName(),
      avatarColor: randomColor(),
      following: [],
      createdAt: Date.now(),
    };

    await AsyncStorage.setItem('@live_user_profile', JSON.stringify(profile));
    return profile;
  },

  async updateUsername(username: string) {
    const profile = await userService.getOrCreate();
    const updated = { ...profile, username };
    await AsyncStorage.setItem('@live_user_profile', JSON.stringify(updated));
    return updated;
  },

  async toggleFollow(hostId: string): Promise<boolean> {
    const profile = await userService.getOrCreate();
    const isFollowing = profile.following.includes(hostId);
    const following = isFollowing
      ? profile.following.filter(id => id !== hostId)
      : [...profile.following, hostId];
    const updated = { ...profile, following };
    await AsyncStorage.setItem('@live_user_profile', JSON.stringify(updated));
    return !isFollowing;
  },

  async isFollowing(hostId: string): Promise<boolean> {
    const profile = await userService.getOrCreate();
    return profile.following.includes(hostId);
  },

  async getFollowing(): Promise<string[]> {
    const profile = await userService.getOrCreate();
    return profile.following;
  },
};
