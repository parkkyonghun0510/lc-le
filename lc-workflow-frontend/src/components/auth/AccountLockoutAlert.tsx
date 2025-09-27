'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Shield, RefreshCw } from 'lucide-react';

interface AccountLockoutAlertProps {
  failedAttempts: number;
  lastActivityAt?: string;
  maxAttempts?: number;
  lockoutDurationMinutes?: number;
  onResetAttempts?: () => void;
}

export default function AccountLockoutAlert({
  failedAttempts,
  lastActivityAt,
  maxAttempts = 5,
  lockoutDurationMinutes = 30,
  onResetAttempts
}: AccountLockoutAlertProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!lastActivityAt || failedAttempts < maxAttempts) {
      setIsLocked(false);
      return;
    }

    const lockoutExpiry = new Date(lastActivityAt);
    lockoutExpiry.setMinutes(lockoutExpiry.getMinutes() + lockoutDurationMinutes);
    
    const now = new Date();
    if (now < lockoutExpiry) {
      setIsLocked(true);
      
      const updateTimer = () => {
        const remaining = lockoutExpiry.getTime() - new Date().getTime();
        if (remaining <= 0) {
          setIsLocked(false);
          return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      
      return () => clearInterval(interval);
    } else {
      setIsLocked(false);
    }
  }, [failedAttempts, lastActivityAt, maxAttempts, lockoutDurationMinutes]);

  if (failedAttempts === 0) {
    return null;
  }

  if (isLocked) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Account Temporarily Locked
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Your account has been locked due to {maxAttempts} failed login attempts.
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Clock className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                Try again in: {timeRemaining}
              </span>
            </div>
            <p className="text-xs text-red-600 mt-2">
              For security reasons, please wait before attempting to log in again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (failedAttempts > 0 && failedAttempts < maxAttempts) {
    const remainingAttempts = maxAttempts - failedAttempts;
    
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Failed Login Attempts
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              You have {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before your account is locked.
            </p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-yellow-600 mb-1">
                <span>Failed attempts</span>
                <span>{failedAttempts}/{maxAttempts}</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(failedAttempts / maxAttempts) * 100}%` }}
                />
              </div>
            </div>
            {onResetAttempts && (
              <button
                onClick={onResetAttempts}
                className="mt-3 text-xs text-yellow-700 hover:text-yellow-800 underline flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset attempts (admin only)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
