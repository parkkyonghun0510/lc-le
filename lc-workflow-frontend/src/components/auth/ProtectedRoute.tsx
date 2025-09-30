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

  console.log('[DEBUG ProtectedRoute] Auth state:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userRole: role,
    requiredRoles,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('[DEBUG ProtectedRoute] Effect triggered:', {
      isAuthenticated,
      isLoading,
      willRedirect: !isLoading && !isAuthenticated
    });

    const timer = setTimeout(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          console.log('[DEBUG ProtectedRoute] Redirecting to login - not authenticated');
          router.push('/login');
        } else if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role || '')) {
          console.log('[DEBUG ProtectedRoute] Redirecting to unauthorized - insufficient role');
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