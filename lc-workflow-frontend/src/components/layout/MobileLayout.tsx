'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSyncService } from '@/services/syncService';
import { getDeviceInfo, DeviceInfo } from '@/utils/deviceDetection';
import {
    Bars3Icon,
    XMarkIcon,
    WifiIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    CloudIcon,
    DevicePhoneMobileIcon,
    ComputerDesktopIcon,
    DeviceTabletIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface MobileLayoutProps {
    children: ReactNode;
    title?: string;
    showSync?: boolean;
    showDeviceInfo?: boolean;
}

export default function MobileLayout({
    children,
    title = 'Files',
    showSync = true,
    showDeviceInfo = false
}: MobileLayoutProps) {
    const { user } = useAuth();
    const { syncStatus, sync, forceRefresh } = useSyncService();
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get device info on mount
    useEffect(() => {
        const fetchDeviceInfo = async () => {
            const info = await getDeviceInfo();
            setDeviceInfo(info);
        };
        fetchDeviceInfo();
    }, []);

    // Handle manual refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await forceRefresh();
            toast.success('Data refreshed successfully');
        } catch (error) {
            toast.error('Failed to refresh data');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Handle sync
    const handleSync = async () => {
        try {
            await sync();
            toast.success('Sync completed');
        } catch (error) {
            toast.error('Sync failed');
        }
    };

    // Get device icon
    const getDeviceIcon = () => {
        if (!deviceInfo) return <DevicePhoneMobileIcon className="h-4 w-4" />;

        if (deviceInfo.isMobile) return <DevicePhoneMobileIcon className="h-4 w-4" />;
        if (deviceInfo.isTablet) return <DeviceTabletIcon className="h-4 w-4" />;
        return <ComputerDesktopIcon className="h-4 w-4" />;
    };

    // Network status component
    const NetworkStatus = () => (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!syncStatus.isOnline
            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
            : syncStatus.syncInProgress
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                : syncStatus.pendingChanges > 0
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
            }`}>
            {syncStatus.syncInProgress ? (
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
            ) : (
                <WifiIcon className="h-3 w-3" />
            )}
            {!syncStatus.isOnline
                ? 'Offline'
                : syncStatus.syncInProgress
                    ? 'Syncing...'
                    : syncStatus.pendingChanges > 0
                        ? `${syncStatus.pendingChanges} pending`
                        : 'Online'
            }
        </div>
    );

    // Sync controls component
    const SyncControls = () => (
        <div className="flex items-center gap-2">
            {showSync && (
                <>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || syncStatus.syncInProgress}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Refresh data"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>

                    {syncStatus.pendingChanges > 0 && (
                        <button
                            onClick={handleSync}
                            disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
                            className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            title="Sync pending changes"
                        >
                            <CloudIcon className="h-5 w-5" />
                        </button>
                    )}
                </>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* Left side */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
                        >
                            <Bars3Icon className="h-6 w-6" />
                        </button>

                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h1>
                            {user && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Welcome, {user?.last_name || user.username}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        <NetworkStatus />
                        <SyncControls />
                    </div>
                </div>

                {/* Device info bar (optional) */}
                {showDeviceInfo && deviceInfo && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                {getDeviceIcon()}
                                <span>
                                    {deviceInfo.platform} • {deviceInfo.browser}
                                    {deviceInfo.hasCamera && ' • Camera Available'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>{deviceInfo.screenWidth}×{deviceInfo.screenHeight}</span>
                                {deviceInfo.touchSupport && (
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                                        Touch
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Offline banner */}
                {!syncStatus.isOnline && (
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <span>You're offline. Changes will sync when reconnected.</span>
                        </div>
                    </div>
                )}

                {/* Pending changes banner */}
                {syncStatus.isOnline && syncStatus.pendingChanges > 0 && (
                    <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                                <CloudIcon className="h-4 w-4" />
                                <span>{syncStatus.pendingChanges} changes pending sync</span>
                            </div>
                            <button
                                onClick={handleSync}
                                disabled={syncStatus.syncInProgress}
                                className="text-xs font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 disabled:opacity-50"
                            >
                                Sync Now
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Mobile Menu Overlay */}
            {showMobileMenu && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
                    <div className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-xl">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</h2>
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-4">
                            {/* Add your mobile menu items here */}
                            <div className="space-y-2">
                                <Link
                                    href="/files"
                                    className="block px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    onClick={() => setShowMobileMenu(false)}
                                >
                                    Files
                                </Link>
                                <Link
                                    href="/applications"
                                    className="block px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    onClick={() => setShowMobileMenu(false)}
                                >
                                    Applications
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="block px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    onClick={() => setShowMobileMenu(false)}
                                >
                                    Dashboard
                                </Link>
                            </div>

                            {/* Sync status in menu */}
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Sync Status
                                    </span>
                                    <NetworkStatus />
                                </div>

                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    <div>Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}</div>
                                    {syncStatus.pendingChanges > 0 && (
                                        <div>Pending changes: {syncStatus.pendingChanges}</div>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => {
                                            handleRefresh();
                                            setShowMobileMenu(false);
                                        }}
                                        disabled={isRefreshing || syncStatus.syncInProgress}
                                        className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                                    </button>

                                    {syncStatus.pendingChanges > 0 && (
                                        <button
                                            onClick={() => {
                                                handleSync();
                                                setShowMobileMenu(false);
                                            }}
                                            disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
                                            className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Sync
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Device info in menu */}
                            {deviceInfo && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                                        Device Info
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <div className="flex items-center gap-2">
                                            {getDeviceIcon()}
                                            <span>{deviceInfo.platform} • {deviceInfo.browser}</span>
                                        </div>
                                        <div>Screen: {deviceInfo.screenWidth}×{deviceInfo.screenHeight}</div>
                                        <div className="flex gap-2 mt-2">
                                            {deviceInfo.hasCamera && (
                                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-xs">
                                                    Camera
                                                </span>
                                            )}
                                            {deviceInfo.touchSupport && (
                                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs">
                                                    Touch
                                                </span>
                                            )}
                                            {deviceInfo.isMobile && (
                                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs">
                                                    Mobile
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    {children}
                </div>
            </main>

            {/* Mobile-optimized bottom spacing */}
            <div className="h-safe-area-inset-bottom" />
        </div>
    );
}