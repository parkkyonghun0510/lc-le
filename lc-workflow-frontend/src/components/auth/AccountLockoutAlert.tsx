'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  Shield,
  RefreshCw,
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface LockoutReason {
  type: 'failed_login' | 'suspicious_activity' | 'admin_lock' | 'security_policy';
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AccountLockoutAlertProps {
  // Core lockout state
  failedAttempts: number;
  isLocked: boolean;
  timeRemaining: string;
  remainingAttempts: number;
  showWarning: boolean;

  // Enhanced features
  lockoutReason?: LockoutReason;
  lockoutHistory?: LockoutReason[];
  isLoading?: boolean;
  error?: string;

  // Actions
  onResetAttempts?: () => Promise<boolean> | boolean;
  onRequestUnlock?: () => Promise<boolean> | boolean;
  onClearError?: () => void;

  // Configuration
  maxAttempts?: number;
  canRequestUnlock?: boolean;
  unlockRequestCooldown?: number;

  // Accessibility
  announceToScreenReader?: (message: string) => void;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'high':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'medium':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'border-red-500 bg-red-50';
    case 'high':
      return 'border-red-300 bg-red-50';
    case 'medium':
      return 'border-yellow-300 bg-yellow-50';
    default:
      return 'border-blue-300 bg-blue-50';
  }
};

export default function AccountLockoutAlert({
  failedAttempts,
  isLocked,
  timeRemaining,
  remainingAttempts,
  showWarning,
  lockoutReason,
  lockoutHistory = [],
  isLoading = false,
  error,
  onResetAttempts,
  onRequestUnlock,
  onClearError,
  maxAttempts = 5,
  canRequestUnlock = true,
  unlockRequestCooldown = 0,
  announceToScreenReader
}: AccountLockoutAlertProps) {
  const [localTimeRemaining, setLocalTimeRemaining] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);

  // Announce important state changes to screen readers
  useEffect(() => {
    if (announceToScreenReader) {
      if (isLocked) {
        announceToScreenReader(`Account is locked. ${timeRemaining} remaining before you can try again.`);
      } else if (showWarning) {
        announceToScreenReader(`${remainingAttempts} login attempts remaining before account lockout.`);
      }
    }
  }, [isLocked, showWarning, timeRemaining, remainingAttempts, announceToScreenReader]);

  // Update local timer for better UX
  useEffect(() => {
    if (isLocked && timeRemaining) {
      setLocalTimeRemaining(timeRemaining);
    }
  }, [isLocked, timeRemaining]);

  // Clear error after a delay
  useEffect(() => {
    if (error && onClearError) {
      const timer = setTimeout(onClearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, onClearError]);

  // Don't render if no issues
  if (failedAttempts === 0 && !showWarning && !isLocked && !error) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4" role="alert" aria-live="polite">
        <div className="flex items-start space-x-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Operation Failed
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {error}
            </p>
            {onClearError && (
              <button
                onClick={onClearError}
                className="mt-2 text-xs text-red-700 hover:text-red-800 underline"
                aria-label="Dismiss error message"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4" role="status" aria-live="polite">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">
            Processing request...
          </span>
        </div>
      </div>
    );
  }

  // Account locked state
  if (isLocked) {
    return (
      <div className={`border rounded-lg p-4 mb-4 ${getSeverityColor(lockoutReason?.severity || 'medium')}`} role="alert" aria-live="assertive">
        <div className="flex items-start space-x-3">
          {lockoutReason ? getSeverityIcon(lockoutReason.severity) : <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Account Temporarily Locked
            </h3>

            {lockoutReason && (
              <div className="mt-2 p-2 bg-red-100 rounded-md">
                <p className="text-xs text-red-700">
                  <strong>Reason:</strong> {lockoutReason.description}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {new Date(lockoutReason.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2 mt-3">
              <Clock className="h-4 w-4 text-red-600" aria-hidden="true" />
              <span className="text-sm text-red-700" aria-label={`Time remaining: ${localTimeRemaining}`}>
                Try again in: <strong>{localTimeRemaining}</strong>
              </span>
            </div>

            <p className="text-xs text-red-600 mt-2">
              For security reasons, please wait before attempting to log in again.
            </p>

            {/* Unlock request option */}
            {onRequestUnlock && canRequestUnlock && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <button
                  onClick={() => onRequestUnlock()}
                  className="text-xs text-red-700 hover:text-red-800 underline flex items-center space-x-1"
                  aria-label="Request account unlock"
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Request early unlock</span>
                </button>
              </div>
            )}

            {unlockRequestCooldown > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Next unlock request available in: {Math.ceil(unlockRequestCooldown / 60)} minutes
              </p>
            )}

            {/* Lockout history */}
            {lockoutHistory.length > 1 && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-red-700 hover:text-red-800 underline"
                  aria-expanded={showHistory}
                  aria-controls="lockout-history"
                >
                  {showHistory ? 'Hide' : 'Show'} lockout history ({lockoutHistory.length})
                </button>

                {showHistory && (
                  <div id="lockout-history" className="mt-2 space-y-1">
                    {lockoutHistory.slice(-3).map((reason, index) => (
                      <div key={index} className="text-xs text-red-600 p-2 bg-red-100 rounded">
                        <p><strong>{reason.description}</strong></p>
                        <p>{new Date(reason.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Warning state (approaching lockout)
  if (showWarning || (failedAttempts > 0 && failedAttempts < maxAttempts)) {
    const progressPercentage = (failedAttempts / maxAttempts) * 100;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4" role="alert" aria-live="polite">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Login Attempts Warning
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              You have <strong>{remainingAttempts}</strong> attempt{remainingAttempts !== 1 ? 's' : ''} remaining before your account is locked.
            </p>

            {/* Progress indicator */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-yellow-600 mb-1">
                <span>Failed attempts progress</span>
                <span>{failedAttempts}/{maxAttempts}</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2" role="progressbar" aria-valuenow={failedAttempts} aria-valuemin={0} aria-valuemax={maxAttempts}>
                <div
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                  aria-label={`${progressPercentage.toFixed(0)}% of maximum attempts reached`}
                />
              </div>
            </div>

            {/* Lockout information */}
            <div className="mt-3 p-2 bg-yellow-100 rounded-md">
              <p className="text-xs text-yellow-700">
                <strong>What happens next:</strong> After {maxAttempts} failed attempts, your account will be locked for security reasons.
              </p>
            </div>

            {/* Admin reset option */}
            {onResetAttempts && (
              <div className="mt-3 pt-3 border-t border-yellow-200">
                <button
                  onClick={() => onResetAttempts()}
                  className="text-xs text-yellow-700 hover:text-yellow-800 underline flex items-center space-x-1"
                  aria-label="Reset failed attempts (admin only)"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reset attempts (admin only)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
