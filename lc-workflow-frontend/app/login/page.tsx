'use client';

import { useForm } from 'react-hook-form';
import { useLogin } from '@/hooks/useAuth';
import { LoginCredentials } from '@/types/models';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import AccountLockoutAlert from '@/components/auth/AccountLockoutAlert';
import { useAccountLockout } from '@/hooks/useAccountLockout';

export default function LoginPage() {
  const login = useLogin();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthContext();
  const [username, setUsername] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
    clearErrors
  } = useForm<LoginCredentials>();

  const watchedUsername = watch('username');
  const lockoutState = useAccountLockout();

  // Screen reader announcements
  const [screenReaderMessage, setScreenReaderMessage] = useState('');

  const announceToScreenReader = useCallback((message: string) => {
    setScreenReaderMessage(message);
    // Clear the message after a short delay
    setTimeout(() => setScreenReaderMessage(''), 1000);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginCredentials) => {
    setUsername(data.username);
    clearErrors();

    try {
      await login.mutateAsync(data);

      // If login succeeds, record the successful attempt
      announceToScreenReader('Login successful. Redirecting...');
    } catch (error: any) {
      // Record failed attempt for lockout tracking
      await lockoutState.recordFailedAttempt(
        error?.response?.data?.detail || 'Invalid credentials'
      );

      // Show form validation error
      setError('root', {
        type: 'manual',
        message: typeof error?.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Login failed. Please check your credentials.'
      });

      announceToScreenReader('Login failed. Please try again.');
    }
  };

  // Show lockout alert if user has failed attempts or warnings
  const shouldShowLockoutAlert = (lockoutState.failedAttempts > 0 && lockoutState.showWarning) ||
    lockoutState.isLocked ||
    lockoutState.error ||
    (user?.username === watchedUsername || watchedUsername === username);

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight ">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm ">
          LC Workflow Management System
        </p>
        {login.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-300">
              {typeof login.error?.response?.data?.detail === 'string' 
                ? login.error.response.data.detail 
                : 'Login failed. Please check your credentials.'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Account Lockout Alert */}
          {shouldShowLockoutAlert && (
            <AccountLockoutAlert
              failedAttempts={lockoutState.failedAttempts}
              isLocked={lockoutState.isLocked}
              timeRemaining={lockoutState.timeRemaining}
              remainingAttempts={lockoutState.remainingAttempts}
              showWarning={lockoutState.showWarning}
              lockoutReason={lockoutState.lockoutReason}
              lockoutHistory={lockoutState.lockoutHistory}
              isLoading={lockoutState.isLoading}
              error={lockoutState.error}
              onResetAttempts={lockoutState.resetAttempts}
              onRequestUnlock={lockoutState.requestUnlock}
              onClearError={lockoutState.clearError}
              maxAttempts={lockoutState.maxAttempts}
              canRequestUnlock={lockoutState.canRequestUnlock}
              unlockRequestCooldown={lockoutState.unlockRequestCooldown}
              announceToScreenReader={announceToScreenReader}
            />
          )}

          {/* Screen reader announcements */}
          {screenReaderMessage && (
            <div className="sr-only" role="status" aria-live="polite">
              {screenReaderMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <div className="mt-1">
                <input
                  {...register('username', { required: 'Username is required' })}
                  type="text"
                  autoComplete="username"
                  className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type="password"
                  autoComplete="current-password"
                  className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={login.isPending || lockoutState.isLoading}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 dark:bg-blue-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {login.isPending || lockoutState.isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>

            {/* Additional lockout information */}
            {lockoutState.isLocked && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  Account is temporarily locked. Please wait for the timer to expire or contact support if you need immediate access.
                </p>
              </div>
            )}
          </form>

          <div className="mt-6">
            <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                    LC Workflow System
                  </span>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}