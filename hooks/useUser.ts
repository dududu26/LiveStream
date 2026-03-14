// Powered by OnSpace.AI
import { useState, useEffect } from 'react';
import { UserProfile, userService } from '@/services/userService';
import { wsService } from '@/services/websocket';

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getOrCreate().then((profile) => {
      setUser(profile);
      wsService.init(profile.userId, profile.username, profile.avatarColor);
      setLoading(false);
    });
  }, []);

  const updateUsername = async (username: string) => {
    const updated = await userService.updateUsername(username);
    setUser(updated);
    wsService.init(updated.userId, updated.username, updated.avatarColor);
    return updated;
  };

  const toggleFollow = async (hostId: string) => {
    const nowFollowing = await userService.toggleFollow(hostId);
    const updated = await userService.getOrCreate();
    setUser(updated);
    return nowFollowing;
  };

  const isFollowing = (hostId: string) => {
    return user?.following.includes(hostId) ?? false;
  };

  return { user, loading, updateUsername, toggleFollow, isFollowing };
}
