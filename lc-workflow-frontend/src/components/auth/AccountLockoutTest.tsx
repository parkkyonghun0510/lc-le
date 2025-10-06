'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccountLockout } from '@/hooks/useAccountLockout';
import AccountLockoutAlert from './AccountLockoutAlert';
import { useAuthContext } from '@/providers/AuthProvider';

interface TestMetrics {
  renderCount: number;
  effectRuns: number;
  configChanges: number;
  persistentStateOperations: number;
  timerOperations: number;
  errors: string[];
}

export default function AccountLockoutTest() {
  const { user } = useAuthContext();
  const [testConfig, setTestConfig] = useState({
    maxAttempts: 3,
    baseLockoutDurationMinutes: 1,
    warningThreshold: 1
  });

  const [testMetrics, setTestMetrics] = useState<TestMetrics>({
    renderCount: 0,
    effectRuns: 0,
    configChanges: 0,
    persistentStateOperations: 0,
    timerOperations: 0,
    errors: []
  });

  const renderCountRef = useRef(0);
  const effectRunsRef = useRef(0);
  const configChangesRef = useRef(0);

  // Track render count
  useEffect(() => {
    renderCountRef.current += 1;
    setTestMetrics(prev => ({
      ...prev,
      renderCount: renderCountRef.current
    }));
  });

  // Test different config scenarios
  const testConfigStability = useCallback(() => {
    configChangesRef.current += 1;
    setTestMetrics(prev => ({
      ...prev,
      configChanges: configChangesRef.current
    }));

    // Test 1: Same config (should not cause re-renders)
    setTestConfig(prev => ({ ...prev }));

    setTimeout(() => {
      // Test 2: Modified config (should cause controlled re-render)
      setTestConfig(prev => ({
        ...prev,
        maxAttempts: prev.maxAttempts + 1
      }));
    }, 100);
  }, []);

  // Test hook with current config
  const lockoutState = useAccountLockout(testConfig);

  // Track effect runs by monitoring lockout state changes
  useEffect(() => {
    effectRunsRef.current += 1;
    setTestMetrics(prev => ({
      ...prev,
      effectRuns: effectRunsRef.current
    }));
  }, [lockoutState.failedAttempts, lockoutState.isLocked, lockoutState.timeRemaining]);

  // Test functions
  const testFailedAttempts = useCallback(async () => {
    for (let i = 0; i < testConfig.maxAttempts + 1; i++) {
      await lockoutState.recordFailedAttempt(`Test attempt ${i + 1}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [lockoutState, testConfig.maxAttempts]);

  const testResetAttempts = useCallback(async () => {
    const success = await lockoutState.resetAttempts();
    if (!success) {
      setTestMetrics(prev => ({
        ...prev,
        errors: [...prev.errors, 'Reset attempts failed']
      }));
    }
  }, [lockoutState]);

  const testRequestUnlock = useCallback(async () => {
    if (lockoutState.isLocked) {
      const success = await lockoutState.requestUnlock();
      if (!success) {
        setTestMetrics(prev => ({
          ...prev,
          errors: [...prev.errors, 'Request unlock failed']
        }));
      }
    }
  }, [lockoutState]);

  const clearErrors = useCallback(() => {
    setTestMetrics(prev => ({
      ...prev,
      errors: []
    }));
  }, []);

  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    effectRunsRef.current = 0;
    configChangesRef.current = 0;
    setTestMetrics({
      renderCount: 0,
      effectRuns: 0,
      configChanges: 0,
      persistentStateOperations: 0,
      timerOperations: 0,
      errors: []
    });
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Account Lockout Hook Test</h1>

      {/* Test Metrics */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Test Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Render Count:</span>
            <span className={`ml-2 px-2 py-1 rounded ${testMetrics.renderCount > 50 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {testMetrics.renderCount}
            </span>
          </div>
          <div>
            <span className="font-medium">Effect Runs:</span>
            <span className={`ml-2 px-2 py-1 rounded ${testMetrics.effectRuns > 20 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {testMetrics.effectRuns}
            </span>
          </div>
          <div>
            <span className="font-medium">Config Changes:</span>
            <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-800">
              {testMetrics.configChanges}
            </span>
          </div>
          <div>
            <span className="font-medium">Errors:</span>
            <span className={`ml-2 px-2 py-1 rounded ${testMetrics.errors.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {testMetrics.errors.length}
            </span>
          </div>
        </div>

        {/* Warning for excessive renders */}
        {testMetrics.renderCount > 50 && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-red-800 text-sm font-medium">
              ⚠️ High render count detected! This may indicate an infinite loop.
            </p>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Test Controls</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={testConfigStability}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Test Config Stability
          </button>
          <button
            onClick={testFailedAttempts}
            className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
          >
            Simulate Failed Attempts
          </button>
          <button
            onClick={testResetAttempts}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Test Reset Attempts
          </button>
          <button
            onClick={testRequestUnlock}
            className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
            disabled={!lockoutState.isLocked}
          >
            Test Request Unlock
          </button>
          <button
            onClick={resetMetrics}
            className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            Reset Metrics
          </button>
          <button
            onClick={clearErrors}
            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            disabled={testMetrics.errors.length === 0}
          >
            Clear Errors
          </button>
        </div>
      </div>

      {/* Current Config */}
      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Current Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Max Attempts:</span> {testConfig.maxAttempts}
          </div>
          <div>
            <span className="font-medium">Lockout Duration:</span> {testConfig.baseLockoutDurationMinutes} min
          </div>
          <div>
            <span className="font-medium">Warning Threshold:</span> {testConfig.warningThreshold}
          </div>
        </div>
      </div>

      {/* Hook State Display */}
      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Hook State</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Failed Attempts:</span> {lockoutState.failedAttempts}
          </div>
          <div>
            <span className="font-medium">Remaining Attempts:</span> {lockoutState.remainingAttempts}
          </div>
          <div>
            <span className="font-medium">Is Locked:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${lockoutState.isLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {lockoutState.isLocked ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Time Remaining:</span> {lockoutState.timeRemaining || 'None'}
          </div>
          <div>
            <span className="font-medium">Show Warning:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${lockoutState.showWarning ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
              {lockoutState.showWarning ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Can Request Unlock:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${lockoutState.canRequestUnlock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {lockoutState.canRequestUnlock ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Account Lockout Alert (if conditions are met) */}
      {(lockoutState.failedAttempts > 0 || lockoutState.showWarning || lockoutState.isLocked || lockoutState.error) && (
        <div className="mb-6">
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
          />
        </div>
      )}

      {/* Error Display */}
      {testMetrics.errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-red-800 dark:text-red-200">Errors</h3>
          <ul className="list-disc list-inside space-y-1">
            {testMetrics.errors.map((error, index) => (
              <li key={index} className="text-red-700 dark:text-red-300 text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Test Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">Test Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-700 dark:text-blue-300 text-sm">
          <li>Click "Test Config Stability" to verify config changes don't cause infinite loops</li>
          <li>Click "Simulate Failed Attempts" to test lockout behavior</li>
          <li>Monitor render count - it should remain stable (not continuously increasing)</li>
          <li>Test reset and unlock functionality when account is locked</li>
          <li>Verify no React errors appear in browser console</li>
        </ol>
      </div>
    </div>
  );
}