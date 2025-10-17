'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  detectBrowser,
  isWarningDismissed,
  dismissWarning,
  getSupportedBrowsersText,
  getFormattedBrowserName,
  getMinimumVersion,
} from '@/utils/browserDetection';

/**
 * Browser Compatibility Warning Banner
 * Displays a warning when user is on an unsupported browser version
 */
export function BrowserCompatibilityWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<{
    name: string;
    version: number;
    formattedName: string;
    minimumVersion: number;
  } | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if warning was already dismissed
    if (isWarningDismissed()) {
      return;
    }

    // Detect browser
    const browser = detectBrowser();

    // Show warning if browser is not supported
    if (!browser.isSupported) {
      setBrowserInfo({
        name: browser.name,
        version: browser.version,
        formattedName: getFormattedBrowserName(browser.name),
        minimumVersion: getMinimumVersion(browser.name),
      });
      setShowWarning(true);
    }
  }, []);

  const handleDismiss = () => {
    dismissWarning();
    setShowWarning(false);
  };

  if (!showWarning || !browserInfo) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-start gap-3">
          {/* Warning Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <ExclamationTriangleIcon
              className="h-5 w-5 text-yellow-600 dark:text-yellow-500"
              aria-hidden="true"
            />
          </div>

          {/* Warning Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
              Unsupported Browser Version
            </h3>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <p>
                You are using{' '}
                <span className="font-medium">
                  {browserInfo.formattedName} {browserInfo.version}
                </span>
                {browserInfo.minimumVersion > 0 && (
                  <>
                    , but this application requires version{' '}
                    <span className="font-medium">{browserInfo.minimumVersion}</span> or higher.
                  </>
                )}
              </p>
              <p className="text-xs">
                <span className="font-medium">Supported browsers:</span>{' '}
                {getSupportedBrowsersText()}
              </p>
              <p className="text-xs mt-2">
                Some features may not work correctly. Please update your browser for the best
                experience.
              </p>
            </div>
          </div>

          {/* Dismiss Button */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex rounded-md p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
              aria-label="Dismiss browser compatibility warning"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
