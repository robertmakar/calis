import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { isOnboardingComplete } from '@/lib/user-preferences';

export default function TabLayout() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    isOnboardingComplete().then((done) => {
      if (active && !done) {
        router.replace('/onboarding');
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  return <AppTabs />;
}
