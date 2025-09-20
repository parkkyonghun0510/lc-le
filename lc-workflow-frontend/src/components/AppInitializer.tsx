'use client';

import { useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncService } from '@/services/syncService';
import { serviceWorkerManager } from '@/utils/serviceWorker';
import { getDeviceInfo } from '@/utils/deviceDetection';
import toast from 'react-hot-toast';

interface AppInitializerProps {
  children: ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        // Initialize sync service with query client
        syncService.initialize(queryClient);

        // Register service worker for offline support
        if ('serviceWorker' in navigator) {
          const registration = await serviceWorkerManager.register();
          
          if (registration && mounted) {
            console.log('Service Worker registered successfully');
            
            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', (event) => {
              const { type, data } = event.data;
              
              switch (type) {
                case 'UPLOAD_SUCCESS':
                  toast.success(`File uploaded: ${data.filename}`, {
                    icon: '📁',
                    duration: 4000
                  });
                  // Invalidate queries to refresh data
                  queryClient.invalidateQueries({ queryKey: ['files'] });
                  break;
                  
                case 'DATA_SYNC_COMPLETE':
                  toast.success('Data synchronized', {
                    icon: '🔄',
                    duration: 3000
                  });
                  break;
                  
                case 'CACHE_UPDATED':
                  console.log('Cache updated:', data);
                  break;
              }
            });

            // Listen for service worker updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Show update available notification
                    toast((t) => (
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">App Update Available</p>
                          <p className="text-sm text-gray-600">Restart to get the latest features</p>
                        </div>
                        <button
                          onClick={() => {
                            serviceWorkerManager.skipWaiting();
                            toast.dismiss(t.id);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Update
                        </button>
                      </div>
                    ), {
                      duration: 10000,
                      icon: '🔄'
                    });
                  }
                });
              }
            });
          }
        }

        // Get device info and show mobile-specific features
        const deviceInfo = await getDeviceInfo();
        
        if (deviceInfo.isMobile && mounted) {
          // Show mobile-specific welcome message
          setTimeout(() => {
            if (deviceInfo.hasCamera) {
              toast.success('Mobile features available: Camera capture enabled', {
                icon: '📱',
                duration: 5000
              });
            }
          }, 2000);

          // Check if app can be installed as PWA
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            
            // Show install prompt after a delay
            setTimeout(() => {
              toast((t) => (
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">Install App</p>
                    <p className="text-sm text-gray-600">Add to home screen for better experience</p>
                  </div>
                  <button
                    onClick={() => {
                      (e as any).prompt();
                      toast.dismiss(t.id);
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    Install
                  </button>
                </div>
              ), {
                duration: 15000,
                icon: '📲'
              });
            }, 5000);
          });
        }

        // Handle network status changes
        const handleOnline = () => {
          if (mounted) {
            toast.success('Back online - syncing data...', {
              icon: '🌐',
              duration: 3000
            });
            // Trigger sync
            syncService.sync().catch(console.error);
          }
        };

        const handleOffline = () => {
          if (mounted) {
            toast.error('You are offline - changes will sync when reconnected', {
              icon: '📡',
              duration: 5000
            });
          }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Handle app visibility changes (for sync on focus)
        const handleVisibilityChange = () => {
          if (!document.hidden && typeof navigator !== 'undefined' && navigator.onLine && mounted) {
            // App became visible and we're online - sync data
            syncService.sync().catch(console.error);
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Handle background sync events
        window.addEventListener('sw-upload-success', ((event: CustomEvent) => {
          if (mounted) {
            toast.success(`Background upload completed: ${event.detail.filename}`, {
              icon: '📁',
              duration: 4000
            });
            queryClient.invalidateQueries({ queryKey: ['files'] });
          }
        }) as EventListener);

        window.addEventListener('sw-sync-complete', (() => {
          if (mounted) {
            toast.success('Background sync completed', {
              icon: '🔄',
              duration: 3000
            });
            queryClient.invalidateQueries();
          }
        }) as EventListener);

        // Cleanup function
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('sw-upload-success', handleOnline);
          window.removeEventListener('sw-sync-complete', handleOffline);
        };

      } catch (error) {
        console.error('Failed to initialize app:', error);
        if (mounted) {
          toast.error('Failed to initialize some features', {
            duration: 5000
          });
        }
      }
    };

    const cleanup = initializeApp();

    return () => {
      mounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [queryClient]);

  // Handle share target (when app is opened via share)
  useEffect(() => {
    const handleShare = async () => {
      const url = new URL(window.location.href);
      
      if (url.searchParams.get('action') === 'share') {
        // Handle shared files
        const title = url.searchParams.get('title');
        const text = url.searchParams.get('text');
        const sharedUrl = url.searchParams.get('url');
        
        if (title || text || sharedUrl) {
          toast.success('Shared content received', {
            icon: '📤',
            duration: 4000
          });
          
          // Navigate to upload page
          window.location.href = '/files/mobile?action=upload';
        }
      }
      
      if (url.searchParams.get('action') === 'upload') {
        // Direct upload action
        setTimeout(() => {
          toast.success('Ready to upload files', {
            icon: '📁',
            duration: 3000
          });
        }, 1000);
      }
      
      if (url.searchParams.get('action') === 'camera') {
        // Direct camera action
        setTimeout(() => {
          toast.success('Camera ready for document capture', {
            icon: '📷',
            duration: 3000
          });
        }, 1000);
      }
    };

    handleShare();
  }, []);

  return <>{children}</>;
}