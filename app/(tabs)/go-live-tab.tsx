// Powered by OnSpace.AI
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function GoLiveTab() {
  const router = useRouter();

  useEffect(() => {
    router.push('/golive');
  }, []);

  return null;
}
