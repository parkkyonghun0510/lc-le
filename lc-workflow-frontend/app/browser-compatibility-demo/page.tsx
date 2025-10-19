'use client';

import { useState } from 'react';
import {
  detectBrowser,
  checkBrowserSupport,
  getMinimumVersion,
  getSupportedBrowsersText,
  getFormattedBrowserName,
  isWarningDismissed,
  dismissWarning,
  clearWarningDismissal,
} from '@/utils/browserDetection';

/**
 * Browser Compatibility Demo Page
 * Demonstrates browser detection and compatibility checking
 */
export default function BrowserCompatibilityDemoPage() {
  const [browserInfo, setBrowserInfo] = useState(() => detectBrowser());
  const [isDismissed, setIsDismissed] = useState(() => isWarningDismissed());

  const handleRefresh = () => {
    setBrowserInfo(detectBrowser());
    setIsDismissed(isWarningDismissed());
  };

  const handleDismiss = () => {
    dismissWarning();
    setIsDismissed(true);
  };

  const handleClearDismissal = () => {
    clearWarningDismissal();
    setIsDismissed(false);
  };

  const minimumVersion = getMinimumVersion(browserInfo.name);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Browser Compatibility Detection Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test browser detection and compatibility checking functionality
          </p>
        </div>

        {/* Current Browser Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Current Browser
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Browser Name:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {getFormattedBrowserName(browserInfo.name)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Version:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {browserInfo.version || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Minimum Required:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {minimumVersion > 0 ? minimumVersion : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span
                className={`font-medium ${
                  browserInfo.isSupported
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {browserInfo.isSupported ? '✓ Supported' : '✗ Unsupported'}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 text-sm">User Agent:</span>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 break-all font-mono">
                {browserInfo.userAgent}
              </p>
            </div>
          </div>
        </div>

        {/* Supported Browsers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Supported Browsers
          </h2>
          <p className="text-gray-700 dark:text-gray-300">{getSupportedBrowsersText()}</p>
        </div>

        {/* Warning Dismissal Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Warning Dismissal Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Warning Dismissed:</span>
              <span
                className={`font-medium ${
                  isDismissed
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {isDismissed ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                disabled={isDismissed}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Dismiss Warning
              </button>
              <button
                onClick={handleClearDismissal}
                disabled={!isDismissed}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Clear Dismissal
              </button>
            </div>
          </div>
        </div>

        {/* Test Different Browsers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Different Browsers
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Open browser console and run these commands to test different browsers:
          </p>
          <div className="space-y-2 font-mono text-xs">
            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
              <div className="text-gray-500 dark:text-gray-500 mb-1">{'//'} Old Chrome (unsupported)</div>
              <code className="text-gray-900 dark:text-gray-100">
                Object.defineProperty(navigator, 'userAgent', {'{'} value: 'Chrome/85.0', configurable: true {'}'});
              </code>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
              <div className="text-gray-500 dark:text-gray-500 mb-1">{'//'} Old Firefox (unsupported)</div>
              <code className="text-gray-900 dark:text-gray-100">
                Object.defineProperty(navigator, 'userAgent', {'{'} value: 'Firefox/85.0', configurable: true {'}'});
              </code>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
              <div className="text-gray-500 dark:text-gray-500 mb-1">{'//'} Old Safari (unsupported)</div>
              <code className="text-gray-900 dark:text-gray-100">
                Object.defineProperty(navigator, 'userAgent', {'{'} value: 'Version/13.0 Safari', configurable: true {'}'});
              </code>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            After running a command, click the refresh button below to see the updated detection.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
          >
            Refresh Detection
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
          >
            Reload Page
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Testing Instructions
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li>Clear dismissal state using the "Clear Dismissal" button</li>
            <li>Open browser console and run one of the test commands above</li>
            <li>Click "Refresh Detection" to see the updated browser info</li>
            <li>Reload the page to see the warning banner (if browser is unsupported)</li>
            <li>Click the X button on the warning to dismiss it</li>
            <li>Reload again - warning should stay hidden</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
