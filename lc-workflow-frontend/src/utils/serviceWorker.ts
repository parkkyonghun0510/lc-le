/**
 * Service Worker registration and management utilities
 * Provides offline support and background sync capabilities
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: ((status: ServiceWorkerStatus) => void)[] = [];
  private status: ServiceWorkerStatus = {
    isSupported: false,
    isRegistered: false,
    isOnline: navigator.onLine,
    hasUpdate: false,
    registration: null
  };

  constructor() {
    this.status.isSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    this.setupNetworkListeners();
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.status.isSupported) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.status.isRegistered = true;
      this.status.registration = this.registration;

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.status.hasUpdate = true;
              this.notifyListeners();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

      this.notifyListeners();
      console.log('Service Worker registered successfully');
      
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Update the service worker
   */
  async update(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
      this.status.hasUpdate = false;
      this.notifyListeners();
    } catch (error) {
      console.error('Service Worker update failed:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration || !this.registration.waiting) return;

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload page after activation
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  /**
   * Queue file upload for background sync
   */
  async queueUpload(uploadData: {
    file: File;
    applicationId?: string;
    folderId?: string;
    documentType?: string;
    fieldName?: string;
  }): Promise<void> {
    if (!this.registration) return;

    // Convert File to serializable format
    const fileData = {
      name: uploadData.file.name,
      type: uploadData.file.type,
      size: uploadData.file.size,
      lastModified: uploadData.file.lastModified,
      arrayBuffer: await uploadData.file.arrayBuffer()
    };

    this.registration.active?.postMessage({
      type: 'QUEUE_UPLOAD',
      data: {
        file: fileData,
        applicationId: uploadData.applicationId,
        folderId: uploadData.folderId,
        documentType: uploadData.documentType,
        fieldName: uploadData.fieldName
      }
    });
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<Record<string, number>> {
    if (!this.registration) return {};

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active?.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (!this.registration) return;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = () => {
        resolve();
      };

      this.registration!.active?.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Check if app is running in standalone mode (PWA)
   */
  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) return null;

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource
      });

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Get current service worker status
   */
  getStatus(): ServiceWorkerStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (status: ServiceWorkerStatus) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Handle messages from service worker
   */
  private handleMessage(event: MessageEvent) {
    const { type, data } = event.data;

    switch (type) {
      case 'UPLOAD_SUCCESS':
        // Notify app of successful background upload
        window.dispatchEvent(new CustomEvent('sw-upload-success', { detail: data }));
        break;

      case 'DATA_SYNC_COMPLETE':
        // Notify app that data sync is complete
        window.dispatchEvent(new CustomEvent('sw-sync-complete'));
        break;

      case 'CACHE_UPDATED':
        // Notify app that cache has been updated
        window.dispatchEvent(new CustomEvent('sw-cache-updated', { detail: data }));
        break;
    }
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
    const updateOnlineStatus = () => {
      this.status.isOnline = navigator.onLine;
      this.notifyListeners();
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  /**
   * Notify all listeners of status changes
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance (lazy initialization)
let serviceWorkerManagerInstance: ServiceWorkerManager | null = null;

export const serviceWorkerManager = {
    get instance(): ServiceWorkerManager {
        if (!serviceWorkerManagerInstance) {
            serviceWorkerManagerInstance = new ServiceWorkerManager();
        }
        return serviceWorkerManagerInstance;
    },
    
    register() {
        return this.instance.register();
    },
    
    update() {
        return this.instance.update();
    },
    
    skipWaiting() {
        return this.instance.skipWaiting();
    },
    
    queueUpload(data: Parameters<ServiceWorkerManager['queueUpload']>[0]) {
        return this.instance.queueUpload(data);
    },
    
    getCacheStatus() {
        return this.instance.getCacheStatus();
    },
    
    clearCache() {
        return this.instance.clearCache();
    },
    
    isStandalone() {
        return this.instance.isStandalone();
    },
    
    requestNotificationPermission() {
        return this.instance.requestNotificationPermission();
    },
    
    subscribeToPush(vapidKey: string) {
        return this.instance.subscribeToPush(vapidKey);
    },
    
    getStatus() {
        return this.instance.getStatus();
    },
    
    onStatusChange(listener: (status: ServiceWorkerStatus) => void) {
        return this.instance.onStatusChange(listener);
    }
};

// React hook for using service worker
export function useServiceWorker() {
  const [status, setStatus] = React.useState<ServiceWorkerStatus>(() => {
    if (typeof window === 'undefined') {
      return {
        isSupported: false,
        isRegistered: false,
        isOnline: true,
        hasUpdate: false,
        registration: null
      };
    }
    return serviceWorkerManager.getStatus();
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const unsubscribe = serviceWorkerManager.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return {
    status,
    register: () => serviceWorkerManager.register(),
    update: () => serviceWorkerManager.update(),
    skipWaiting: () => serviceWorkerManager.skipWaiting(),
    queueUpload: (data: Parameters<typeof serviceWorkerManager.queueUpload>[0]) => 
      serviceWorkerManager.queueUpload(data),
    getCacheStatus: () => serviceWorkerManager.getCacheStatus(),
    clearCache: () => serviceWorkerManager.clearCache(),
    isStandalone: () => serviceWorkerManager.isStandalone(),
    requestNotificationPermission: () => serviceWorkerManager.requestNotificationPermission(),
    subscribeToPush: (vapidKey: string) => serviceWorkerManager.subscribeToPush(vapidKey)
  };
}

// Utility functions
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

export function isPWAInstallable(): boolean {
  return 'BeforeInstallPromptEvent' in window;
}

export function isOffline(): boolean {
  return !navigator.onLine;
}

export function getNetworkType(): string {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  return connection?.effectiveType || 'unknown';
}

export function isSlowNetwork(): boolean {
  const networkType = getNetworkType();
  return networkType === 'slow-2g' || networkType === '2g';
}

// Add React import for the hook
import React from 'react';