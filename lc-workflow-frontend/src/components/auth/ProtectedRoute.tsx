'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, role } = useAuthContext();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push('/login');
        } else if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role || '')) {
          router.push('/unauthorized');
        }
      }
    }, 1000); // Wait 1 second for auth state to stabilize

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, requiredRoles, role, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role || '')) {
    return null;
  }

  return <>{children}</>;
}