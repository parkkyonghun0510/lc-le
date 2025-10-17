/**
 * Browser Compatibility Warning Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserCompatibilityWarning } from '../BrowserCompatibilityWarning';
import * as browserDetection from '@/utils/browserDetection';

// Mock the browser detection utilities
jest.mock('@/utils/browserDetection', () => ({
  detectBrowser: jest.fn(),
  isWarningDismissed: jest.fn(),
  dismissWarning: jest.fn(),
  getSupportedBrowsersText: jest.fn(() => 'Chrome 90+, Firefox 88+, Safari 14+, Edge 90+'),
  getFormattedBrowserName: jest.fn((name: string) => {
    const names: Record<string, string> = {
      chrome: 'Google Chrome',
      firefox: 'Mozilla Firefox',
      safari: 'Safari',
      edge: 'Microsoft Edge',
    };
    return names[name] || 'Unknown Browser';
  }),
  getMinimumVersion: jest.fn((name: string) => {
    const versions: Record<string, number> = {
      chrome: 90,
      firefox: 88,
      safari: 14,
      edge: 90,
    };
    return versions[name] || 0;
  }),
}));

describe('BrowserCompatibilityWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when browser is supported', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'chrome',
      version: 95,
      isSupported: true,
      userAgent: 'Chrome/95.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(false);

    const { container } = render(<BrowserCompatibilityWarning />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when warning is dismissed', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'chrome',
      version: 85,
      isSupported: false,
      userAgent: 'Chrome/85.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(true);

    const { container } = render(<BrowserCompatibilityWarning />);
    expect(container.firstChild).toBeNull();
  });

  it('should render warning for unsupported Chrome version', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'chrome',
      version: 85,
      isSupported: false,
      userAgent: 'Chrome/85.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(false);

    const { container } = render(<BrowserCompatibilityWarning />);

    expect(screen.getByText('Unsupported Browser Version')).toBeInTheDocument();
    expect(screen.getByText(/Google Chrome/)).toBeInTheDocument();
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(container.textContent).toContain('version 90 or higher');
    expect(screen.getByText(/Chrome 90\+, Firefox 88\+, Safari 14\+, Edge 90\+/)).toBeInTheDocument();
  });

  it('should render warning for unsupported Firefox version', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'firefox',
      version: 85,
      isSupported: false,
      userAgent: 'Firefox/85.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(false);

    const { container } = render(<BrowserCompatibilityWarning />);

    expect(screen.getByText(/Mozilla Firefox/)).toBeInTheDocument();
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(container.textContent).toContain('version 88 or higher');
  });

  it('should render warning for unsupported Safari version', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'safari',
      version: 13,
      isSupported: false,
      userAgent: 'Safari/13.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(false);

    const { container } = render(<BrowserCompatibilityWarning />);

    expect(container.textContent).toContain('Safari 13');
    expect(container.textContent).toContain('version 14 or higher');
  });

  it('should render warning for unsupported Edge version', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'edge',
      version: 85,
      isSupported: false,
      userAgent: 'Edge/85.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(false);

    const { container } = render(<BrowserCompatibilityWarning />);

    expect(screen.getByText(/Microsoft Edge/)).toBeInTheDocument();
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(container.textContent).toContain('version 90 or higher');
  });

  it('should dismiss warning when close button is clicked', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'chrome',
      version: 85,
      isSupported: false,
      userAgent: 'Chrome/85.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(false);

    const { container } = render(<BrowserCompatibilityWarning />);

    const dismissButton = screen.getByLabelText('Dismiss browser compatibility warning');
    fireEvent.click(dismissButton);

    expect(browserDetection.dismissWarning).toHaveBeenCalled();
    expect(container.firstChild).toBeNull();
  });

  it('should have proper accessibility attributes', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'chrome',
      version: 85,
      isSupported: false,
      userAgent: 'Chrome/85.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(false);

    render(<BrowserCompatibilityWarning />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');

    const dismissButton = screen.getByLabelText('Dismiss browser compatibility warning');
    expect(dismissButton).toBeInTheDocument();
  });

  it('should display helpful message about updating browser', () => {
    (browserDetection.detectBrowser as jest.Mock).mockReturnValue({
      name: 'chrome',
      version: 85,
      isSupported: false,
      userAgent: 'Chrome/85.0',
    });
    (browserDetection.isWarningDismissed as jest.Mock).mockReturnValue(false);

    render(<BrowserCompatibilityWarning />);

    expect(
      screen.getByText(/Some features may not work correctly/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please update your browser for the best experience/)
    ).toBeInTheDocument();
  });
});
