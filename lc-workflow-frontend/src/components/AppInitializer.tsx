'use client';

import { useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncService } from '@/services/syncService';
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
          if (!document.hidden && navigator.onLine && mounted) {
            // App became visible and we're online - sync data
            syncService.sync().catch(console.error);
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);


        // Cleanup function
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
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