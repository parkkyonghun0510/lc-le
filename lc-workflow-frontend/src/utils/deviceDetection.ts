/**
 * Mobile device detection utility
 * Detects if the user is accessing from a mobile device
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasCamera: boolean;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  touchSupport: boolean;
  browser: string;
}

/**
 * Detects if the current device is a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  
  // Comprehensive mobile detection for all major platforms
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /IEMobile/i,
    /Opera Mini/i,
    /Mobile/i,
    /mobile/i,
    /CriOS/i, // Chrome on iOS
    /FxiOS/i, // Firefox on iOS
    /EdgiOS/i, // Edge on iOS
    /SamsungBrowser/i,
    /UCBrowser/i,
    /MiuiBrowser/i
  ];
  
  const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
  const isMobileTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  const isMobileScreen = window.innerWidth <= 768;
  const isMobileOrientation = 'orientation' in window;
  
  return isMobileUA || isMobileTouch || (isMobileScreen && isMobileOrientation);
};

/**
 * Detects if the current device is a tablet
 */
export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
  
  return tabletRegex.test(userAgent) || (window.innerWidth > 768 && window.innerWidth <= 1024);
};

/**
 * Checks if the device has camera capabilities
 */
export const hasCameraSupport = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (error) {
    console.warn('Error checking camera support:', error);
    return false;
  }
};

/**
 * Gets comprehensive device information
 */
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const isMobile = isMobileDevice();
  const isTablet = isTabletDevice();
  const isDesktop = !isMobile && !isTablet;
  const hasCamera = await hasCameraSupport();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  // Detect platform
  let platform = 'Unknown';
  if (typeof navigator !== 'undefined') {
    if (/iPhone|iPad|iPod/i.test(userAgent)) platform = 'iOS';
    else if (/Android/i.test(userAgent)) platform = 'Android';
    else if (/Windows Phone/i.test(userAgent)) platform = 'Windows Phone';
    else if (/BlackBerry/i.test(userAgent)) platform = 'BlackBerry';
    else if (/webOS/i.test(userAgent)) platform = 'webOS';
    else if (!isMobile) platform = 'Desktop';
  }
  
  // Detect browser
  let browser = 'Unknown';
  if (typeof navigator !== 'undefined') {
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) browser = 'Chrome';
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Edge/i.test(userAgent)) browser = 'Edge';
    else if (/SamsungBrowser/i.test(userAgent)) browser = 'Samsung Browser';
    else if (/UCBrowser/i.test(userAgent)) browser = 'UC Browser';
  }
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    hasCamera,
    userAgent,
    platform,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    touchSupport: typeof window !== 'undefined' && typeof navigator !== 'undefined' ? ('ontouchstart' in window || (navigator.maxTouchPoints > 0)) : false,
    browser
  };
};

/**
 * Checks if the current environment supports camera access
 */
export const isCameraAccessSupported = (): boolean => {
  return (
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
  );
};

/**
 * Gets available camera constraints for the device
 */
export const getCameraConstraints = (facingMode: 'user' | 'environment' = 'environment') => {
  return {
    video: {
      facingMode,
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      aspectRatio: { ideal: 16/9 }
    },
    audio: false
  };
};