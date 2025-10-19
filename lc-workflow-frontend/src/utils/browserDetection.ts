/**
 * Browser Detection Utility
 * Detects browser type and version for compatibility checking
 */

export interface BrowserInfo {
  name: string;
  version: number;
  isSupported: boolean;
  userAgent: string;
}

export interface MinimumVersions {
  chrome: number;
  firefox: number;
  safari: number;
  edge: number;
}

const MINIMUM_VERSIONS: MinimumVersions = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
};

/**
 * Detect browser name and version from user agent
 */
export function detectBrowser(): BrowserInfo {
  // Return default values during SSR
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      name: 'unknown',
      version: 0,
      isSupported: true, // Assume supported during SSR to avoid hydration issues
      userAgent: '',
    };
  }
  
  const userAgent = navigator.userAgent;
  let name = 'unknown';
  let version = 0;

  // Edge (Chromium-based)
  if (userAgent.includes('Edg/')) {
    name = 'edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Chrome
  else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
    name = 'chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Firefox
  else if (userAgent.includes('Firefox/')) {
    name = 'firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Safari
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    name = 'safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }

  const isSupported = checkBrowserSupport(name, version);

  return {
    name,
    version,
    isSupported,
    userAgent,
  };
}

/**
 * Check if browser version meets minimum requirements
 */
export function checkBrowserSupport(browserName: string, version: number): boolean {
  switch (browserName) {
    case 'chrome':
      return version >= MINIMUM_VERSIONS.chrome;
    case 'firefox':
      return version >= MINIMUM_VERSIONS.firefox;
    case 'safari':
      return version >= MINIMUM_VERSIONS.safari;
    case 'edge':
      return version >= MINIMUM_VERSIONS.edge;
    default:
      // Unknown browsers are considered unsupported
      return false;
  }
}

/**
 * Get minimum version for a specific browser
 */
export function getMinimumVersion(browserName: string): number {
  return MINIMUM_VERSIONS[browserName as keyof MinimumVersions] || 0;
}

/**
 * Get all supported browser versions as a formatted string
 */
export function getSupportedBrowsersText(): string {
  return `Chrome ${MINIMUM_VERSIONS.chrome}+, Firefox ${MINIMUM_VERSIONS.firefox}+, Safari ${MINIMUM_VERSIONS.safari}+, Edge ${MINIMUM_VERSIONS.edge}+`;
}

/**
 * Get formatted browser name for display
 */
export function getFormattedBrowserName(browserName: string): string {
  const names: Record<string, string> = {
    chrome: 'Google Chrome',
    firefox: 'Mozilla Firefox',
    safari: 'Safari',
    edge: 'Microsoft Edge',
    unknown: 'Unknown Browser',
  };
  return names[browserName] || 'Unknown Browser';
}

/**
 * Check if warning has been dismissed
 */
export function isWarningDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const dismissed = localStorage.getItem('browser-compatibility-warning-dismissed');
    return dismissed === 'true';
  } catch {
    return false;
  }
}

/**
 * Dismiss the warning
 */
export function dismissWarning(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('browser-compatibility-warning-dismissed', 'true');
  } catch (error) {
    console.error('Failed to save warning dismissal:', error);
  }
}

/**
 * Clear the dismissal (for testing)
 */
export function clearWarningDismissal(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('browser-compatibility-warning-dismissed');
  } catch (error) {
    console.error('Failed to clear warning dismissal:', error);
  }
}
