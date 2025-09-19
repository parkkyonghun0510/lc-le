/**
 * Cross-device synchronization service for file management
 * Provides real-time updates and offline support
 */

import { QueryClient } from '@tanstack/react-query';
import { fileKeys, folderKeys } from '@/hooks/useFiles';
import toast from 'react-hot-toast';

export interface SyncEvent {
    type: 'file_uploaded' | 'file_deleted' | 'folder_created' | 'folder_deleted' | 'file_updated';
    data: any;
    timestamp: number;
    userId?: string;
    applicationId?: string;
}

export interface SyncStatus {
    isOnline: boolean;
    lastSync: number;
    pendingChanges: number;
    syncInProgress: boolean;
}

class SyncService {
    private queryClient: QueryClient | null = null;
    private eventSource: EventSource | null = null;
    private syncStatus: SyncStatus = {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        lastSync: Date.now(),
        pendingChanges: 0,
        syncInProgress: false
    };
    private listeners: ((status: SyncStatus) => void)[] = [];
    private pendingEvents: SyncEvent[] = [];
    private retryTimeout: NodeJS.Timeout | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.setupNetworkListeners();
        this.setupVisibilityListener();
    }

    /**
     * Initialize the sync service with QueryClient
     */
    initialize(queryClient: QueryClient) {
        this.queryClient = queryClient;
        this.startSync();
    }

    /**
     * Start real-time synchronization
     */
    private startSync() {
        if (!this.queryClient) return;

        // Start Server-Sent Events connection for real-time updates
        this.connectEventSource();

        // Start heartbeat to detect connection issues
        this.startHeartbeat();
    }

    /**
     * Connect to Server-Sent Events for real-time updates
     */
    private connectEventSource() {
        try {
            // In a real implementation, this would connect to your backend SSE endpoint
            // For now, we'll simulate with periodic checks
            this.simulateRealTimeUpdates();
        } catch (error) {
            console.error('Failed to connect to sync service:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Simulate real-time updates (replace with actual SSE in production)
     */
    private simulateRealTimeUpdates() {
        // This would be replaced with actual SSE connection
        // For demonstration, we'll use periodic polling as fallback
        const pollInterval = setInterval(() => {
            if (this.syncStatus.isOnline && this.queryClient) {
                this.checkForUpdates();
            }
        }, 30000); // Poll every 30 seconds

        // Store interval for cleanup
        (this as any).pollInterval = pollInterval;
    }

    /**
     * Check for updates from server
     */
    private async checkForUpdates() {
        if (!this.queryClient || this.syncStatus.syncInProgress) return;

        try {
            this.setSyncStatus({ syncInProgress: true });

            // Invalidate queries to fetch fresh data
            await this.queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
            await this.queryClient.invalidateQueries({ queryKey: folderKeys.lists() });

            this.setSyncStatus({
                lastSync: Date.now(),
                syncInProgress: false
            });

        } catch (error) {
            console.error('Sync check failed:', error);
            this.setSyncStatus({ syncInProgress: false });
        }
    }

    /**
     * Handle incoming sync events
     */
    private handleSyncEvent(event: SyncEvent) {
        if (!this.queryClient) {
            this.pendingEvents.push(event);
            return;
        }

        switch (event.type) {
            case 'file_uploaded':
                this.handleFileUploaded(event);
                break;
            case 'file_deleted':
                this.handleFileDeleted(event);
                break;
            case 'folder_created':
                this.handleFolderCreated(event);
                break;
            case 'folder_deleted':
                this.handleFolderDeleted(event);
                break;
            case 'file_updated':
                this.handleFileUpdated(event);
                break;
        }
    }

    /**
     * Handle file uploaded event
     */
    private handleFileUploaded(event: SyncEvent) {
        if (!this.queryClient) return;

        // Invalidate file lists to show new file
        this.queryClient.invalidateQueries({ queryKey: fileKeys.lists() });

        if (event.data.application_id) {
            this.queryClient.invalidateQueries({
                queryKey: fileKeys.list({ application_id: event.data.application_id })
            });
        }

        // Show notification if from another device/user
        if (event.userId && event.userId !== this.getCurrentUserId()) {
            toast.success(`New file uploaded: ${event.data.filename}`, {
                duration: 4000,
                icon: '📁'
            });
        }
    }

    /**
     * Handle file deleted event
     */
    private handleFileDeleted(event: SyncEvent) {
        if (!this.queryClient) return;

        // Remove from cache
        this.queryClient.removeQueries({ queryKey: fileKeys.detail(event.data.id) });

        // Invalidate lists
        this.queryClient.invalidateQueries({ queryKey: fileKeys.lists() });

        // Show notification
        if (event.userId && event.userId !== this.getCurrentUserId()) {
            toast(`File deleted: ${event.data.filename}`, {
                duration: 3000,
                icon: '🗑️'
            });
        }
    }

    /**
     * Handle folder created event
     */
    private handleFolderCreated(event: SyncEvent) {
        if (!this.queryClient) return;

        this.queryClient.invalidateQueries({ queryKey: folderKeys.lists() });

        if (event.userId && event.userId !== this.getCurrentUserId()) {
            toast.success(`New folder created: ${event.data.name}`, {
                duration: 3000,
                icon: '📂'
            });
        }
    }

    /**
     * Handle folder deleted event
     */
    private handleFolderDeleted(event: SyncEvent) {
        if (!this.queryClient) return;

        this.queryClient.removeQueries({ queryKey: folderKeys.detail(event.data.id) });
        this.queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
        this.queryClient.invalidateQueries({ queryKey: fileKeys.lists() });

        if (event.userId && event.userId !== this.getCurrentUserId()) {
            toast(`Folder deleted: ${event.data.name}`, {
                duration: 3000,
                icon: '📂'
            });
        }
    }

    /**
     * Handle file updated event
     */
    private handleFileUpdated(event: SyncEvent) {
        if (!this.queryClient) return;

        // Update specific file in cache
        this.queryClient.setQueryData(fileKeys.detail(event.data.id), event.data);

        // Invalidate lists to reflect changes
        this.queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
    }

    /**
     * Setup network status listeners
     */
    private setupNetworkListeners() {
        if (typeof window === 'undefined') return;
        
        const updateOnlineStatus = () => {
            if (typeof navigator === 'undefined') return;
            
            const wasOffline = !this.syncStatus.isOnline;
            this.setSyncStatus({ isOnline: navigator.onLine });

            if (navigator.onLine && wasOffline) {
                // Back online - process pending events and sync
                this.processPendingEvents();
                this.checkForUpdates();
                toast.success('Back online - syncing data...', { icon: '🌐' });
            } else if (!navigator.onLine) {
                toast.error('You are offline - changes will sync when reconnected', {
                    icon: '📡',
                    duration: 5000
                });
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    }

    /**
     * Setup page visibility listener for sync on focus
     */
    private setupVisibilityListener() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.syncStatus.isOnline) {
                // Page became visible - check for updates
                this.checkForUpdates();
            }
        });
    }

    /**
     * Start heartbeat to detect connection issues
     */
    private startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.syncStatus.isOnline) {
                this.pingServer();
            }
        }, 60000); // Ping every minute
    }

    /**
     * Ping server to check connection
     */
    private async pingServer() {
        try {
            // In production, this would ping your backend health endpoint
            const response = await fetch('/api/v1/health', {
                method: 'HEAD',
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error('Server unreachable');
            }
        } catch (error) {
            console.warn('Server ping failed:', error);
            // Could trigger reconnection logic here
        }
    }

    /**
     * Process pending events when back online
     */
    private processPendingEvents() {
        const events = [...this.pendingEvents];
        this.pendingEvents = [];

        events.forEach(event => {
            this.handleSyncEvent(event);
        });

        if (events.length > 0) {
            toast.success(`Processed ${events.length} pending updates`, { icon: '⚡' });
        }
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect() {
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }

        this.retryTimeout = setTimeout(() => {
            if (this.syncStatus.isOnline) {
                this.connectEventSource();
            }
        }, 5000); // Retry after 5 seconds
    }

    /**
     * Update sync status and notify listeners
     */
    private setSyncStatus(updates: Partial<SyncStatus>) {
        this.syncStatus = { ...this.syncStatus, ...updates };
        this.listeners.forEach(listener => listener(this.syncStatus));
    }

    /**
     * Get current user ID (implement based on your auth system)
     */
    private getCurrentUserId(): string | null {
        // This should return the current user's ID
        // Implementation depends on your authentication system
        return null;
    }

    /**
     * Public API methods
     */

    /**
     * Get current sync status
     */
    getSyncStatus(): SyncStatus {
        return { ...this.syncStatus };
    }

    /**
     * Subscribe to sync status changes
     */
    onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
        this.listeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Manually trigger sync
     */
    async sync(): Promise<void> {
        if (!this.syncStatus.isOnline) {
            throw new Error('Cannot sync while offline');
        }

        await this.checkForUpdates();
    }

    /**
     * Queue an event for processing (used for optimistic updates)
     */
    queueEvent(event: Omit<SyncEvent, 'timestamp'>): void {
        const fullEvent: SyncEvent = {
            ...event,
            timestamp: Date.now()
        };

        if (this.syncStatus.isOnline) {
            this.handleSyncEvent(fullEvent);
        } else {
            this.pendingEvents.push(fullEvent);
            this.setSyncStatus({
                pendingChanges: this.syncStatus.pendingChanges + 1
            });
        }
    }

    /**
     * Force refresh all data
     */
    async forceRefresh(): Promise<void> {
        if (!this.queryClient) return;

        toast.loading('Refreshing all data...', { id: 'force-refresh' });

        try {
            // Clear all caches and refetch
            await this.queryClient.invalidateQueries();

            toast.success('Data refreshed successfully', { id: 'force-refresh' });
        } catch (error) {
            toast.error('Failed to refresh data', { id: 'force-refresh' });
            throw error;
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if ((this as any).pollInterval) {
            clearInterval((this as any).pollInterval);
        }

        this.listeners = [];
        this.pendingEvents = [];
    }
}

// Export singleton instance (lazy initialization)
let syncServiceInstance: SyncService | null = null;

export const syncService = {
    get instance(): SyncService {
        if (!syncServiceInstance) {
            syncServiceInstance = new SyncService();
        }
        return syncServiceInstance;
    },
    
    initialize(queryClient: QueryClient) {
        return this.instance.initialize(queryClient);
    },
    
    getSyncStatus() {
        return this.instance.getSyncStatus();
    },
    
    onSyncStatusChange(listener: (status: SyncStatus) => void) {
        return this.instance.onSyncStatusChange(listener);
    },
    
    sync() {
        return this.instance.sync();
    },
    
    forceRefresh() {
        return this.instance.forceRefresh();
    },
    
    queueEvent(event: Omit<SyncEvent, 'timestamp'>) {
        return this.instance.queueEvent(event);
    }
};

// React hook for using sync service
export function useSyncService() {
    const [syncStatus, setSyncStatus] = React.useState<SyncStatus>(() => {
        if (typeof window === 'undefined') {
            return {
                isOnline: true,
                lastSync: Date.now(),
                pendingChanges: 0,
                syncInProgress: false
            };
        }
        return syncService.getSyncStatus();
    });

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const unsubscribe = syncService.onSyncStatusChange(setSyncStatus);
        return unsubscribe;
    }, []);

    return {
        syncStatus,
        sync: () => syncService.sync(),
        forceRefresh: () => syncService.forceRefresh(),
        queueEvent: (event: Omit<SyncEvent, 'timestamp'>) => syncService.queueEvent(event)
    };
}

// Add React import for the hook
import React from 'react';