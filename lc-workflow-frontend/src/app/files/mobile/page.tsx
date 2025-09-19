'use client';

import { useState, useEffect } from 'react';
import { useFiles, useApplications } from '@/hooks/useFiles';
import { useAuth } from '@/hooks/useAuth';
import { useSyncService } from '@/services/syncService';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ViewColumnsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import MobileLayout from '@/components/layout/MobileLayout';
import MobileFileManager from '@/components/files/MobileFileManager';
import MobileFileUpload from '@/components/files/MobileFileUpload';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getDeviceInfo, DeviceInfo } from '@/utils/deviceDetection';
import toast from 'react-hot-toast';

function MobileFilesPageContent() {
  const { user } = useAuth();
  const { syncStatus, queueEvent } = useSyncService();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  // API hooks with mobile-optimized settings
  const { data: filesData, isLoading, error, refetch } = useFiles({
    application_id: selectedApplicationId || undefined,
    search: searchTerm || undefined,
    limit: 50, // Smaller limit for mobile
  });
  
  const { data: applicationsData, isLoading: applicationsLoading } = useApplications({
    page: 1,
    size: 50, // Smaller limit for mobile
  });

  // Get device info on mount
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
    };
    fetchDeviceInfo();
  }, []);

  // Initialize sync service
  useEffect(() => {
    // Queue events for optimistic updates
    const handleOptimisticUpdate = (type: string, data: any) => {
      queueEvent({ type: type as any, data });
    };

    // Example: Listen for file operations and queue sync events
    // This would be integrated with your actual file operations
    
  }, [queueEvent]);

  const filteredFiles = filesData?.items || [];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Debounce search in a real implementation
  };

  const handleApplicationFilter = (appId: string) => {
    setSelectedApplicationId(appId);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedApplicationId('');
    setShowFilters(false);
  };

  return (
    <MobileLayout 
      title="Files" 
      showSync={true}
      showDeviceInfo={deviceInfo?.isMobile}
    >
      <div className="space-y-4">
        {/* Mobile Search and Filters */}
        <div className="mobile-card mobile-spacing">
          {/* Search Bar */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="mobile-form-input pl-10 pr-4"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showFilters || selectedApplicationId
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                Filters
                {selectedApplicationId && (
                  <span className="bg-blue-500 text-white text-xs rounded-full w-2 h-2"></span>
                )}
              </button>

              {(searchTerm || selectedApplicationId) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <ViewColumnsIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 mobile-fade-in">
              <div className="space-y-3">
                <div>
                  <label className="mobile-form-label">Application</label>
                  <select
                    value={selectedApplicationId}
                    onChange={(e) => handleApplicationFilter(e.target.value)}
                    className="mobile-form-input"
                    disabled={applicationsLoading}
                  >
                    <option value="">
                      {applicationsLoading ? 'Loading...' : 'All Applications'}
                    </option>
                    {applicationsData?.items?.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.full_name_latin || app.full_name_khmer || `Application ${app.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sync Status Banner */}
        {!syncStatus.isOnline && (
          <div className="mobile-card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="mobile-spacing-sm">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Offline mode - changes will sync when reconnected</span>
              </div>
            </div>
          </div>
        )}

        {syncStatus.pendingChanges > 0 && (
          <div className="mobile-card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="mobile-spacing-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>{syncStatus.pendingChanges} changes pending sync</span>
                </div>
                <button
                  onClick={() => toast.success('Sync will happen automatically when online')}
                  className="text-xs font-medium text-yellow-800 dark:text-yellow-200"
                >
                  Info
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Files Content */}
        <div className="mobile-card">
          <div className="mobile-spacing">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading files...</p>
                {deviceInfo?.isMobile && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Pull down to refresh
                  </p>
                )}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                  <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Failed to load files
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {error.message}
                </p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <MobileFileManager
                applicationId={selectedApplicationId || undefined}
                showUpload={true}
                compact={false}
                maxFiles={50}
              />
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {filteredFiles.length > 0 && (
          <div className="mobile-card">
            <div className="mobile-spacing-sm">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{filteredFiles.length} files</span>
                <span>
                  {filteredFiles.reduce((total, file) => total + file.file_size, 0) > 0 && 
                    `${(filteredFiles.reduce((total, file) => total + file.file_size, 0) / (1024 * 1024)).toFixed(1)} MB total`
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <MobileFileUpload
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            applicationId={selectedApplicationId || undefined}
            maxFileSize={10 * 1024 * 1024} // 10MB
          />
        )}
      </div>
    </MobileLayout>
  );
}

export default function MobileFilesPage() {
  return (
    <ProtectedRoute>
      <MobileFilesPageContent />
    </ProtectedRoute>
  );
}