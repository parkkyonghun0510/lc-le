/**
 * Browser Detection Tests
 * Tests browser detection logic and compatibility checking
 */

import {
  detectBrowser,
  checkBrowserSupport,
  getMinimumVersion,
  getSupportedBrowsersText,
  getFormattedBrowserName,
  isWarningDismissed,
  dismissWarning,
  clearWarningDismissal,
} from '../browserDetection';

describe('browserDetection', () => {
  // Store original userAgent
  const originalUserAgent = navigator.userAgent;

  // Helper to mock userAgent
  const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
    });
  };

  afterEach(() => {
    // Restore original userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    // Clear localStorage
    clearWarningDismissal();
  });

  describe('detectBrowser', () => {
    it('should detect Chrome correctly', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
      );
      const browser = detectBrowser();
      expect(browser.name).toBe('chrome');
      expect(browser.version).toBe(95);
      expect(browser.isSupported).toBe(true);
    });

    it('should detect old Chrome as unsupported', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
      );
      const browser = detectBrowser();
      expect(browser.name).toBe('chrome');
      expect(browser.version).toBe(85);
      expect(browser.isSupported).toBe(false);
    });

    it('should detect Firefox correctly', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0'
      );
      const browser = detectBrowser();
      expect(browser.name).toBe('firefox');
      expect(browser.version).toBe(92);
      expect(browser.isSupported).toBe(true);
    });

    it('should detect old Firefox as unsupported', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:85.0) Gecko/20100101 Firefox/85.0'
      );
      const browser = detectBrowser();
      expect(browser.name).toBe('firefox');
      expect(browser.version).toBe(85);
      expect(browser.isSupported).toBe(false);
    });

    it('should detect Safari correctly', () => {
      mockUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15'
      );
      const browser = detectBrowser();
      expect(browser.name).toBe('safari');
      expect(browser.version).toBe(15);
      expect(browser.isSupported).toBe(true);
    });

    it('should detect old Safari as unsupported', () => {
      mockUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15'
      );
      const browser = detectBrowser();
      expect(browser.name).toBe('safari');
      expect(browser.version).toBe(13);
      expect(browser.isSupported).toBe(false);
    });

    it('should detect Edge correctly', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 Edg/95.0.1020.44'
      );
      const browser = detectBrowser();
      expect(browser.name).toBe('edge');
      expect(browser.version).toBe(95);
      expect(browser.isSupported).toBe(true);
    });

    it('should detect old Edge as unsupported', () => {
      mockUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36 Edg/85.0.564.68'
      );
      const browser = detectBrowser();
      expect(browser.name).toBe('edge');
      expect(browser.version).toBe(85);
      expect(browser.isSupported).toBe(false);
    });

    it('should handle unknown browsers', () => {
      mockUserAgent('Unknown Browser/1.0');
      const browser = detectBrowser();
      expect(browser.name).toBe('unknown');
      expect(browser.version).toBe(0);
      expect(browser.isSupported).toBe(false);
    });
  });

  describe('checkBrowserSupport', () => {
    it('should return true for supported Chrome version', () => {
      expect(checkBrowserSupport('chrome', 90)).toBe(true);
      expect(checkBrowserSupport('chrome', 100)).toBe(true);
    });

    it('should return false for unsupported Chrome version', () => {
      expect(checkBrowserSupport('chrome', 89)).toBe(false);
      expect(checkBrowserSupport('chrome', 50)).toBe(false);
    });

    it('should return true for supported Firefox version', () => {
      expect(checkBrowserSupport('firefox', 88)).toBe(true);
      expect(checkBrowserSupport('firefox', 95)).toBe(true);
    });

    it('should return false for unsupported Firefox version', () => {
      expect(checkBrowserSupport('firefox', 87)).toBe(false);
      expect(checkBrowserSupport('firefox', 50)).toBe(false);
    });

    it('should return true for supported Safari version', () => {
      expect(checkBrowserSupport('safari', 14)).toBe(true);
      expect(checkBrowserSupport('safari', 15)).toBe(true);
    });

    it('should return false for unsupported Safari version', () => {
      expect(checkBrowserSupport('safari', 13)).toBe(false);
      expect(checkBrowserSupport('safari', 10)).toBe(false);
    });

    it('should return true for supported Edge version', () => {
      expect(checkBrowserSupport('edge', 90)).toBe(true);
      expect(checkBrowserSupport('edge', 100)).toBe(true);
    });

    it('should return false for unsupported Edge version', () => {
      expect(checkBrowserSupport('edge', 89)).toBe(false);
      expect(checkBrowserSupport('edge', 50)).toBe(false);
    });

    it('should return false for unknown browsers', () => {
      expect(checkBrowserSupport('unknown', 100)).toBe(false);
      expect(checkBrowserSupport('opera', 100)).toBe(false);
    });
  });

  describe('getMinimumVersion', () => {
    it('should return correct minimum versions', () => {
      expect(getMinimumVersion('chrome')).toBe(90);
      expect(getMinimumVersion('firefox')).toBe(88);
      expect(getMinimumVersion('safari')).toBe(14);
      expect(getMinimumVersion('edge')).toBe(90);
    });

    it('should return 0 for unknown browsers', () => {
      expect(getMinimumVersion('unknown')).toBe(0);
      expect(getMinimumVersion('opera')).toBe(0);
    });
  });

  describe('getSupportedBrowsersText', () => {
    it('should return formatted list of supported browsers', () => {
      const text = getSupportedBrowsersText();
      expect(text).toContain('Chrome 90+');
      expect(text).toContain('Firefox 88+');
      expect(text).toContain('Safari 14+');
      expect(text).toContain('Edge 90+');
    });
  });

  describe('getFormattedBrowserName', () => {
    it('should return formatted browser names', () => {
      expect(getFormattedBrowserName('chrome')).toBe('Google Chrome');
      expect(getFormattedBrowserName('firefox')).toBe('Mozilla Firefox');
      expect(getFormattedBrowserName('safari')).toBe('Safari');
      expect(getFormattedBrowserName('edge')).toBe('Microsoft Edge');
      expect(getFormattedBrowserName('unknown')).toBe('Unknown Browser');
    });
  });

  describe('warning dismissal', () => {
    it('should initially return false for isWarningDismissed', () => {
      expect(isWarningDismissed()).toBe(false);
    });

    it('should return true after dismissing warning', () => {
      dismissWarning();
      expect(isWarningDismissed()).toBe(true);
    });

    it('should return false after clearing dismissal', () => {
      dismissWarning();
      expect(isWarningDismissed()).toBe(true);
      clearWarningDismissal();
      expect(isWarningDismissed()).toBe(false);
    });

    it('should persist dismissal across function calls', () => {
      dismissWarning();
      expect(isWarningDismissed()).toBe(true);
      expect(isWarningDismissed()).toBe(true);
    });
  });
});
