'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth, useRole } from '@/hooks/useAuth';
import { User } from '@/types/models';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: any;
  isAdmin: boolean;
  isManager: boolean;
  isOfficer: boolean;
  role: string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, error } = useAuth();
  const { isAdmin, isManager, isOfficer, role } = useRole();

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        error,
        isAdmin,
        isManager,
        isOfficer,
        role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};