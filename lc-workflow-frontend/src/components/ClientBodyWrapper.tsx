'use client';

import { useEffect } from 'react';

interface ClientBodyWrapperProps {
  children: React.ReactNode;
}

export function ClientBodyWrapper({ children }: ClientBodyWrapperProps) {
  useEffect(() => {
    // Handle browser extension attributes that cause hydration mismatch
    const handleBrowserExtensions = () => {
      const body = document.body;
      if (body) {
        // Remove any extension-added attributes that weren't in server render
        const extensionAttrs = ['data-new-gr-c-s-check-loaded', 'data-gr-ext-installed'];
        extensionAttrs.forEach(attr => {
          if (body.hasAttribute(attr)) {
            body.removeAttribute(attr);
          }
        });
      }
    };

    // Run after a short delay to ensure hydration is complete
    const timeoutId = setTimeout(handleBrowserExtensions, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return <>{children}</>;
}