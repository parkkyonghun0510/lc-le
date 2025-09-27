import { useState, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';

interface AccountLockoutState {
  failedAttempts: number;
  lastActivityAt?: string;
  isLocked: boolean;
  timeRemaining: string;
  remainingAttempts: number;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export function useAccountLockout() {
  const { user } = useAuthContext();
  const [lockoutState, setLockoutState] = useState<AccountLockoutState>({
    failedAttempts: 0,
    isLocked: false,
    timeRemaining: '',
    remainingAttempts: MAX_ATTEMPTS
  });

  useEffect(() => {
    if (!user) {
      setLockoutState({
        failedAttempts: 0,
        isLocked: false,
        timeRemaining: '',
        remainingAttempts: MAX_ATTEMPTS
      });
      return;
    }

    const failedAttempts = user.failed_login_attempts || 0;
    const lastActivityAt = user.last_activity_at;
    
    if (failedAttempts === 0) {
      setLockoutState({
        failedAttempts: 0,
        isLocked: false,
        timeRemaining: '',
        remainingAttempts: MAX_ATTEMPTS
      });
      return;
    }

    if (failedAttempts >= MAX_ATTEMPTS && lastActivityAt) {
      const lockoutExpiry = new Date(lastActivityAt);
      lockoutExpiry.setMinutes(lockoutExpiry.getMinutes() + LOCKOUT_DURATION_MINUTES);
      
      const now = new Date();
      if (now < lockoutExpiry) {
        // Account is locked
        const updateTimer = () => {
          const remaining = lockoutExpiry.getTime() - new Date().getTime();
          if (remaining <= 0) {
            setLockoutState(prev => ({
              ...prev,
              isLocked: false,
              timeRemaining: ''
            }));
            return;
          }
          
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          const timeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          setLockoutState(prev => ({
            ...prev,
            failedAttempts,
            isLocked: true,
            timeRemaining,
            remainingAttempts: 0
          }));
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        
        return () => clearInterval(interval);
      } else {
        // Lockout period has expired
        setLockoutState({
          failedAttempts: 0,
          isLocked: false,
          timeRemaining: '',
          remainingAttempts: MAX_ATTEMPTS
        });
      }
    } else {
      // Account is not locked but has failed attempts
      setLockoutState({
        failedAttempts,
        isLocked: false,
        timeRemaining: '',
        remainingAttempts: MAX_ATTEMPTS - failedAttempts
      });
    }
  }, [user]);

  const resetAttempts = () => {
    // This would typically call an API endpoint to reset failed attempts
    // For now, we'll just update the local state
    setLockoutState(prev => ({
      ...prev,
      failedAttempts: 0,
      isLocked: false,
      timeRemaining: '',
      remainingAttempts: MAX_ATTEMPTS
    }));
  };

  return {
    ...lockoutState,
    resetAttempts,
    maxAttempts: MAX_ATTEMPTS,
    lockoutDurationMinutes: LOCKOUT_DURATION_MINUTES
  };
}
