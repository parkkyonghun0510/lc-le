'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth, useRole } from '@/hooks/useAuth';
import { User } from '@/types/models';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  /**
   * @deprecated Use `hasRole('admin')` or `isAdmin()` from usePermissionCheck instead
   */
  isAdmin: boolean;
  /**
   * @deprecated Use `hasRole('manager')` from usePermissionCheck instead
   */
  isManager: boolean;
  /**
   * @deprecated Use `hasRole('officer')` from usePermissionCheck instead
   */
  isOfficer: boolean;
  /**
   * @deprecated Use `hasRole()` from usePermissionCheck instead
   */
  role: string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, error } = useAuth();
  const { isAdmin, isManager, isOfficer, role } = useRole();

  // Log deprecation warning when role flags are accessed
  if (process.env.NODE_ENV === 'development') {
    const originalContext = {
      get isAdmin() {
        console.warn(
          '⚠️ AuthContext.isAdmin is deprecated. Use hasRole("admin") or isAdmin() from usePermissionCheck instead.'
        );
        return isAdmin;
      },
      get isManager() {
        console.warn(
          '⚠️ AuthContext.isManager is deprecated. Use hasRole("manager") from usePermissionCheck instead.'
        );
        return isManager;
      },
      get isOfficer() {
        console.warn(
          '⚠️ AuthContext.isOfficer is deprecated. Use hasRole("officer") from usePermissionCheck instead.'
        );
        return isOfficer;
      },
      get role() {
        console.warn(
          '⚠️ AuthContext.role is deprecated. Use hasRole() from usePermissionCheck instead.'
        );
        return role;
      },
    };
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        error: error ? (typeof error === 'string' ? error : JSON.stringify(error)) : null,
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