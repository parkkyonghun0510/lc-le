import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api';
import { logger } from '@/lib/logger';

interface LockoutConfig {
  maxAttempts: number;
  baseLockoutDurationMinutes: number;
  progressiveLockoutMultiplier: number;
  maxLockoutDurationMinutes: number;
  warningThreshold: number;
  persistenceKey: string;
}

interface LockoutReason {
  type: 'failed_login' | 'suspicious_activity' | 'admin_lock' | 'security_policy';
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AccountLockoutState {
  failedAttempts: number;
  lastActivityAt?: string;
  isLocked: boolean;
  timeRemaining: string;
  remainingAttempts: number;
  lockoutReason?: LockoutReason;
  lockoutHistory: LockoutReason[];
  isLoading: boolean;
  error?: string;
  showWarning: boolean;
  canRequestUnlock: boolean;
  unlockRequestCooldown: number;
}

interface PersistentLockoutState {
  failedAttempts: number;
  lastActivityAt?: string;
  lockoutHistory: LockoutReason[];
  lastUnlockRequest?: string;
  lockoutCount: number;
  lastLockoutDate?: string;
}

const DEFAULT_CONFIG: LockoutConfig = {
  maxAttempts: 5,
  baseLockoutDurationMinutes: 30,
  progressiveLockoutMultiplier: 2,
  maxLockoutDurationMinutes: 480, // 8 hours max
  warningThreshold: 2,
  persistenceKey: 'account_lockout_state'
};

export function useAccountLockout(config: Partial<LockoutConfig> = {}) {
  const { user } = useAuthContext();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [unlockRequestTimer, setUnlockRequestTimer] = useState<NodeJS.Timeout | null>(null);
  const persistentStateRef = useRef<PersistentLockoutState>({
    failedAttempts: 0,
    lockoutHistory: [],
    lockoutCount: 0
  });

  // Extract specific user properties to prevent infinite loops
  // Use useMemo to create stable references that only change when the actual values change
  const userProperties = useMemo(() => ({
    id: user?.id,
    failedLoginAttempts: user?.failed_login_attempts || 0,
    lastActivityAt: user?.last_activity_at
  }), [user?.id, user?.failed_login_attempts, user?.last_activity_at]);

  const [lockoutState, setLockoutState] = useState<AccountLockoutState>({
    failedAttempts: 0,
    isLocked: false,
    timeRemaining: '',
    remainingAttempts: finalConfig.maxAttempts,
    lockoutHistory: [],
    isLoading: false,
    showWarning: false,
    canRequestUnlock: true,
    unlockRequestCooldown: 0
  });

  // Memoize config to prevent infinite loops
  const memoizedConfig = useMemo(() => finalConfig, [
    finalConfig.maxAttempts,
    finalConfig.baseLockoutDurationMinutes,
    finalConfig.progressiveLockoutMultiplier,
    finalConfig.maxLockoutDurationMinutes,
    finalConfig.warningThreshold,
    finalConfig.persistenceKey
  ]);

  // Load persistent state from localStorage - separate effect to avoid loops
  useEffect(() => {
    try {
      const stored = localStorage.getItem(memoizedConfig.persistenceKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the stored data structure
        if (parsed && typeof parsed === 'object') {
          persistentStateRef.current = {
            failedAttempts: parsed.failedAttempts || 0,
            lastActivityAt: parsed.lastActivityAt,
            lockoutHistory: Array.isArray(parsed.lockoutHistory) ? parsed.lockoutHistory : [],
            lastUnlockRequest: parsed.lastUnlockRequest,
            lockoutCount: parsed.lockoutCount || 0,
            lastLockoutDate: parsed.lastLockoutDate
          };
        }
      }
    } catch (error) {
      logger.warn('Failed to load persistent lockout state', { error: String(error) });
    }
  }, [memoizedConfig.persistenceKey]);

  // Save persistent state to localStorage
  const savePersistentState = useCallback((state: PersistentLockoutState) => {
    try {
      localStorage.setItem(memoizedConfig.persistenceKey, JSON.stringify(state));
      persistentStateRef.current = state;
    } catch (error) {
      logger.warn('Failed to save persistent lockout state', { error: String(error) });
    }
  }, [memoizedConfig.persistenceKey]);

  // Calculate progressive lockout duration
  const calculateLockoutDuration = useCallback((lockoutCount: number): number => {
    const duration = memoizedConfig.baseLockoutDurationMinutes *
      Math.pow(memoizedConfig.progressiveLockoutMultiplier, Math.min(lockoutCount, 4));
    return Math.min(duration, memoizedConfig.maxLockoutDurationMinutes);
  }, [memoizedConfig]);

  // Update countdown timer
  const updateTimer = useCallback(() => {
    setLockoutState(prev => {
      if (!prev.isLocked || !prev.lastActivityAt) return prev;

      const persistentState = persistentStateRef.current;
      const lockoutDuration = calculateLockoutDuration(persistentState.lockoutCount);
      const lockoutExpiry = new Date(prev.lastActivityAt);
      lockoutExpiry.setMinutes(lockoutExpiry.getMinutes() + lockoutDuration);

      const now = new Date();
      const remaining = lockoutExpiry.getTime() - now.getTime();

      if (remaining <= 0) {
        // Lockout period has expired
        const newPersistentState = {
          ...persistentState,
          failedAttempts: 0,
          lastActivityAt: undefined,
          lockoutCount: 0
        };
        savePersistentState(newPersistentState);

        return {
          ...prev,
          failedAttempts: 0,
          isLocked: false,
          timeRemaining: '',
          remainingAttempts: memoizedConfig.maxAttempts,
          lockoutReason: undefined,
          lockoutHistory: persistentState.lockoutHistory
        };
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const timeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      return {
        ...prev,
        timeRemaining,
        failedAttempts: persistentState.failedAttempts,
        remainingAttempts: 0
      };
    });
  }, [savePersistentState, calculateLockoutDuration, memoizedConfig.maxAttempts]);

  // Update lockout state based on user data and persistent state
  useEffect(() => {
    const persistentState = persistentStateRef.current;

    if (!userProperties.id) {
      setLockoutState(prev => ({
        ...prev,
        failedAttempts: 0,
        isLocked: false,
        timeRemaining: '',
        remainingAttempts: memoizedConfig.maxAttempts,
        showWarning: false
      }));
      return;
    }

    const failedAttempts = Math.max(userProperties.failedLoginAttempts, persistentState.failedAttempts);
    const lastActivityAt = userProperties.lastActivityAt || persistentState.lastActivityAt;

    // Check if account is currently locked
    if (failedAttempts >= memoizedConfig.maxAttempts && lastActivityAt) {
      const lockoutDuration = calculateLockoutDuration(persistentState.lockoutCount);
      const lockoutExpiry = new Date(lastActivityAt);
      lockoutExpiry.setMinutes(lockoutExpiry.getMinutes() + lockoutDuration);

      const now = new Date();
      if (now < lockoutExpiry) {
        // Account is locked
        updateTimer();

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(updateTimer, 1000);

        const lockoutReason: LockoutReason = {
          type: 'failed_login',
          description: `Account locked after ${failedAttempts} failed login attempts`,
          timestamp: new Date().toISOString(),
          severity: failedAttempts >= memoizedConfig.maxAttempts + 2 ? 'high' : 'medium'
        };

        setLockoutState(prev => ({
          ...prev,
          failedAttempts,
          lastActivityAt,
          isLocked: true,
          remainingAttempts: 0,
          lockoutReason,
          lockoutHistory: [...persistentState.lockoutHistory, lockoutReason],
          showWarning: false
        }));

        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        };
      }
    }

    // Account is not locked but has failed attempts
    const remainingAttempts = memoizedConfig.maxAttempts - failedAttempts;
    const showWarning = failedAttempts >= memoizedConfig.warningThreshold;

    setLockoutState(prev => ({
      ...prev,
      failedAttempts,
      lastActivityAt,
      isLocked: false,
      timeRemaining: '',
      remainingAttempts,
      lockoutHistory: persistentState.lockoutHistory,
      showWarning,
      canRequestUnlock: !persistentState.lastUnlockRequest ||
        (Date.now() - new Date(persistentState.lastUnlockRequest).getTime()) > 300000 // 5 minutes cooldown
    }));

  }, [userProperties, calculateLockoutDuration, memoizedConfig]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (unlockRequestTimer) {
        clearTimeout(unlockRequestTimer);
      }
    };
  }, [unlockRequestTimer]);

  // Reset failed attempts via API
  const resetAttempts = useCallback(async (): Promise<boolean> => {
    if (!userProperties.id) {
      logger.warn('Cannot reset attempts: no user ID available');
      return false;
    }

    setLockoutState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Call API to reset failed attempts
      await apiClient.post(`/users/${userProperties.id}/reset-lockout`);

      // Update local state
      const persistentState = persistentStateRef.current;
      const newPersistentState = {
        ...persistentState,
        failedAttempts: 0,
        lastActivityAt: undefined,
        lockoutCount: 0
      };
      savePersistentState(newPersistentState);

      setLockoutState(prev => ({
        ...prev,
        failedAttempts: 0,
        isLocked: false,
        timeRemaining: '',
        remainingAttempts: memoizedConfig.maxAttempts,
        lockoutReason: undefined,
        isLoading: false,
        showWarning: false
      }));

      logger.info('Successfully reset account lockout attempts', { userId: userProperties.id });
      return true;
    } catch (error) {
      logger.error('Failed to reset account lockout attempts', new Error(String(error)));
      setLockoutState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to reset lockout attempts. Please try again.'
      }));
      return false;
    }
  }, [userProperties.id, savePersistentState, memoizedConfig.maxAttempts]);

  // Request account unlock
  const requestUnlock = useCallback(async (): Promise<boolean> => {
    if (!userProperties.id || !lockoutState.canRequestUnlock) {
      return false;
    }

    setLockoutState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      await apiClient.post(`/users/${userProperties.id}/request-unlock`);

      // Update persistent state
      const persistentState = persistentStateRef.current;
      const newPersistentState = {
        ...persistentState,
        lastUnlockRequest: new Date().toISOString()
      };
      savePersistentState(newPersistentState);

      setLockoutState(prev => ({
        ...prev,
        isLoading: false,
        canRequestUnlock: false,
        unlockRequestCooldown: 300 // 5 minutes
      }));

      // Start cooldown timer
      if (unlockRequestTimer) {
        clearTimeout(unlockRequestTimer);
      }

      const timer = setTimeout(() => {
        setLockoutState(prev => ({ ...prev, canRequestUnlock: true, unlockRequestCooldown: 0 }));
      }, 300000);

      setUnlockRequestTimer(timer);

      logger.info('Successfully requested account unlock', { userId: userProperties.id });
      return true;
    } catch (error) {
      logger.error('Failed to request account unlock', new Error(String(error)));
      setLockoutState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request unlock. Please contact support.'
      }));
      return false;
    }
  }, [userProperties.id, lockoutState.canRequestUnlock, savePersistentState, unlockRequestTimer]);

  // Record failed login attempt
  const recordFailedAttempt = useCallback(async (reason: string = 'Invalid credentials') => {
    if (!userProperties.id) return;

    try {
      const persistentState = persistentStateRef.current;
      const newPersistentState = {
        ...persistentState,
        failedAttempts: persistentState.failedAttempts + 1,
        lastActivityAt: new Date().toISOString()
      };

      // Check if this triggers a lockout
      if (newPersistentState.failedAttempts >= memoizedConfig.maxAttempts) {
        newPersistentState.lockoutCount = (persistentState.lockoutCount || 0) + 1;
        newPersistentState.lastLockoutDate = new Date().toISOString();

        const lockoutReason: LockoutReason = {
          type: 'failed_login',
          description: reason,
          timestamp: new Date().toISOString(),
          severity: newPersistentState.lockoutCount > 2 ? 'high' : 'medium'
        };

        newPersistentState.lockoutHistory = [
          ...(persistentState.lockoutHistory || []),
          lockoutReason
        ].slice(-10); // Keep last 10 lockout events
      }

      savePersistentState(newPersistentState);

      // Update local state
      setLockoutState(prev => {
        const newFailedAttempts = prev.failedAttempts + 1;
        const isNowLocked = newFailedAttempts >= memoizedConfig.maxAttempts;
        const remainingAttempts = isNowLocked ? 0 : memoizedConfig.maxAttempts - newFailedAttempts;

        return {
          ...prev,
          failedAttempts: newFailedAttempts,
          isLocked: isNowLocked,
          remainingAttempts,
          showWarning: newFailedAttempts >= memoizedConfig.warningThreshold,
          lockoutReason: isNowLocked ? {
            type: 'failed_login',
            description: reason,
            timestamp: new Date().toISOString(),
            severity: newPersistentState.lockoutCount > 2 ? 'high' : 'medium'
          } : prev.lockoutReason,
          lockoutHistory: newPersistentState.lockoutHistory
        };
      });

      logger.warn('Recorded failed login attempt', {
        userId: userProperties.id,
        attempts: newPersistentState.failedAttempts,
        reason
      });
    } catch (error) {
      logger.error('Failed to record failed login attempt', new Error(String(error)));
    }
  }, [userProperties.id, savePersistentState, memoizedConfig]);

  // Clear error state
  const clearError = useCallback(() => {
    setLockoutState(prev => ({ ...prev, error: undefined }));
  }, []);

  return {
    ...lockoutState,
    resetAttempts,
    requestUnlock,
    recordFailedAttempt,
    clearError,
    maxAttempts: memoizedConfig.maxAttempts,
    lockoutDurationMinutes: calculateLockoutDuration(lockoutState.lockoutHistory.length),
    config: memoizedConfig
  };
}
