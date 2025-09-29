// Service Worker registration and management
import { useState, useEffect } from 'react';

export interface ServiceWorkerConfig {
  enabled: boolean;
  scope?: string;
  updateViaCache?: string;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;

  constructor(config: Partial<ServiceWorkerConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      scope: '/',
      updateViaCache: 'none',
      ...config,
    };
  }

  async register(): Promise<boolean> {
    if (!this.config.enabled || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW] Service Worker not supported or disabled');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: this.config.scope,
        updateViaCache: this.config.updateViaCache as any,
      });

      console.log('[SW] Service Worker registered successfully:', this.registration.scope);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New service worker available');
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Listen for controller change (page reload after update)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Service worker updated, reloading page');
        window.location.reload();
      });

      return true;
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
      return false;
    }
  }

  private notifyUpdateAvailable(): void {
    // Dispatch custom event for update notification
    const event = new CustomEvent('sw-update-available');
    window.dispatchEvent(event);

    // Show notification to user (optional)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Update', {
        body: 'A new version is available. Refresh to update.',
        icon: '/favicon.ico',
      });
    }
  }

  async update(): Promise<boolean> {
    if (!this.registration) {
      console.log('[SW] No service worker registration found');
      return false;
    }

    try {
      const newWorker = this.registration.waiting;
      if (newWorker) {
        console.log('[SW] Skipping waiting service worker');
        newWorker.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }

      // Trigger update check
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('[SW] Service Worker update failed:', error);
      return false;
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      console.log('[SW] No service worker registration found');
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('[SW] Service Worker unregistered:', result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error('[SW] Service Worker unregister failed:', error);
      return false;
    }
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Utility functions
export async function registerServiceWorker(): Promise<boolean> {
  return serviceWorkerManager.register();
}

export async function updateServiceWorker(): Promise<boolean> {
  return serviceWorkerManager.update();
}

export async function unregisterServiceWorker(): Promise<boolean> {
  return serviceWorkerManager.unregister();
}

export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return serviceWorkerManager.getRegistration();
}

// React hook for service worker management
export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    setIsSupported(serviceWorkerManager.isSupported());
    setRegistration(serviceWorkerManager.getRegistration());
  }, []);

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    window.addEventListener('sw-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  return {
    isSupported,
    registration,
    updateAvailable,
    update: updateServiceWorker,
  };
}