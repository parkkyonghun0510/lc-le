'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/serviceWorker';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker().then((success) => {
      if (success) {
        console.log('Service Worker registered successfully');
      }
    }).catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  }, []);

  return null; // This component doesn't render anything
}