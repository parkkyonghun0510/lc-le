'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSetupRequired } from '@/hooks/useSetup';

interface SetupMiddlewareProps {
  children: React.ReactNode;
}

export function SetupMiddleware({ children }: SetupMiddlewareProps) {
  const router = useRouter();
  const { data: setupData, isLoading } = useSetupRequired();

  useEffect(() => {
    if (!isLoading && setupData && !setupData.setup_required) {
      router.push('/login');
    }
  }, [setupData, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!setupData?.setup_required) {
    return null;
  }

  return <>{children}</>;
}