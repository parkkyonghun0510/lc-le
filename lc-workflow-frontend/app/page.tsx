'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { useSetupRequired } from '@/hooks/useSetup';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { data: setupData, isLoading: setupLoading } = useSetupRequired();

  useEffect(() => {
    if (!authLoading && !setupLoading) {
      if (setupData?.setup_required) {
        router.push('/setup');
      } else if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, authLoading, setupLoading, setupData, router]);

  if (authLoading || setupLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return null;
}
