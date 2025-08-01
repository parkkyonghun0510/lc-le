'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSetupRequired } from '@/hooks/useSetup';

const SetupMiddleware = ({ children }: { children: React.ReactNode }) => {
  const { data: setupData, isLoading: isSetupLoading } = useSetupRequired();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isSetupLoading || isAuthLoading) return;

    const isSetupComplete = !setupData?.setup_required;
    const isSetupPage = pathname === '/setup';

    if (!isSetupComplete && !isSetupPage) {
      router.push('/setup');
    } else if (isSetupComplete && isSetupPage) {
      router.push('/dashboard');
    } else if (isSetupComplete && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }

  }, [setupData, isSetupLoading, isAuthenticated, isAuthLoading, router, pathname]);

  if (isSetupLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SetupMiddleware;
