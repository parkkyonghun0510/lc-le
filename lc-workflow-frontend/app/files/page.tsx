'use client';

import { useState } from 'react';
import { useFiles, useDeleteFile, useDownloadFile, useApplications } from '@/hooks/useFiles';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { ResourceType, PermissionAction } from '@/types/permissions';
import { File } from '@/types/models';
import {
  DocumentIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { formatBytes, formatDate } from '@/lib/utils';
import FileUploadModal from '@/components/files/FileUploadModal';
import FilePreview from '@/components/files/FilePreview';
import FileExplorerView from '@/components/files/FileExplorerView';
import AdvancedFileExplorer from '@/components/files/AdvancedFileExplorer';
import FolderFileExplorer from '@/components/files/FolderFileExplorer';
import CustomerFileExplorer from '@/components/files/CustomerFileExplorer';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function FilesPageContent() {
  const { user } = useAuth();
  const { can } = usePermissionCheck();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'explorer' | 'advanced' | 'folders' | 'customers'>('customers');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);

  // API hooks
  const { data: filesData, isLoading, error } = useFiles({
    application_id: selectedApplicationId || undefined,
    search: searchTerm || undefined,
    limit: 100,
  });
  
  const { data: applicationsData, isLoading: applicationsLoading } = useApplications({
    page: 1,
    size: 100,
  });
  
  const deleteFileMutation = useDeleteFile();
  const { downloadFile } = useDownloadFile();

  // Use API data directly instead of client-side filtering
  const filteredFiles = filesData?.items || [];

  const handlePreviewNavigation = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentPreviewIndex - 1 : currentPreviewIndex + 1;
    if (newIndex >= 0 && newIndex < previewFiles.length) {
      setCurrentPreviewIndex(newIndex);
      setPreviewFile(previewFiles[newIndex]);
    }
  };

  const handleFilePreview = (file: File) => {
    const files = filteredFiles;
    const fileIndex = files.findIndex(f => f.id === file.id);
    setPreviewFiles(files);
    setCurrentPreviewIndex(fileIndex);
    setPreviewFile(file);
  };

  const handleDeleteFile = (file: File) => {
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteFile = async () => {
    if (fileToDelete) {
      try {
        await deleteFileMutation.mutateAsync(fileToDelete.id);
        setShowDeleteConfirm(false);
        setFileToDelete(null);
        // Show success message
        console.log('File deleted successfully');
      } catch (error) {
        console.error('Failed to delete file:', error);
        // Keep dialog open to show error state
      }
    }
  };

  const handleDownloadFile = async (file: File) => {
    try {
      await downloadFile(file.id, file.display_name || file.original_filename);
      // Show success message
      console.log('File download started');
    } catch (error) {
      console.error('Failed to download file:', error);
      // Show error message to user
    }
  };


  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Files</h1>
                <p className="text-gray-600">Manage uploaded files and documents</p>
                {error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">Error loading files: {error.message}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('customers')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'customers' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Customers
                  </button>
                  <button
                    onClick={() => setViewMode('folders')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'folders' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Folders
                  </button>
                  <button
                    onClick={() => setViewMode('advanced')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'advanced' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Explorer
                  </button>
                  <button
                    onClick={() => setViewMode('explorer')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'explorer' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'table' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Table
                  </button>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Upload File
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="sm:w-64">
                <select
                  value={selectedApplicationId}
                  onChange={(e) => setSelectedApplicationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={applicationsLoading}
                >
                  <option value="">
                    {applicationsLoading ? 'Loading applications...' : 'All Applications'}
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

          {/* Files View */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading files...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load files</h3>
              <p className="text-gray-600 mb-4">{error.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : viewMode === 'customers' ? (
            <CustomerFileExplorer
              showActions={true}
            />
          ) : viewMode === 'folders' ? (
            <FolderFileExplorer
              applicationId={selectedApplicationId || undefined}
              showActions={true}
            />
          ) : viewMode === 'advanced' ? (
            <AdvancedFileExplorer
              applicationId={selectedApplicationId || undefined}
              showActions={true}
            />
          ) : viewMode === 'explorer' ? (
            <FileExplorerView
              applicationId={selectedApplicationId || undefined}
              showActions={true}
            />
          ) : (
            /* Table View */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by uploading your first file.'}
                  </p>
                  {!searchTerm && (
                    <div className="mt-6">
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Upload File
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            File
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Uploaded
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Application
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredFiles.map((file) => (
                          <tr key={file.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {file.display_name || file.original_filename}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {file.filename}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatBytes(file.file_size)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {file.mime_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(file.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {file.application_id ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Linked
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Standalone
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleFilePreview(file)}
                                  className="text-gray-600 hover:text-gray-900 p-1"
                                  title="Preview"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadFile(file)}
                                  className="text-blue-600 hover:text-blue-900 p-1"
                                  title="Download"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                </button>
                                {(can(ResourceType.FILE, PermissionAction.DELETE) || file.uploaded_by === user?.id) && (
                                  <button
                                    onClick={() => handleDeleteFile(file)}
                                    className="text-red-600 hover:text-red-900 p-1"
                                    title="Delete"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File Preview */}
          {previewFile && (
            <FilePreview
              file={previewFile}
              isOpen={!!previewFile}
              onClose={() => setPreviewFile(null)}
              files={previewFiles}
              currentIndex={currentPreviewIndex}
              onNavigate={handlePreviewNavigation}
            />
          )}

          {/* Upload Modal */}
          {showUploadModal && (
            <FileUploadModal
              isOpen={showUploadModal}
              onClose={() => setShowUploadModal(false)}
            />
          )}

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => {
              if (!deleteFileMutation.isPending) {
                setShowDeleteConfirm(false);
                setFileToDelete(null);
              }
            }}
            onConfirm={confirmDeleteFile}
            title="Delete File"
            message={
              deleteFileMutation.isPending
                ? 'Deleting file...'
                : deleteFileMutation.isError
                ? `Error deleting file: ${deleteFileMutation.error?.message || 'Unknown error'}`
                : `Are you sure you want to delete "${fileToDelete?.display_name || fileToDelete?.original_filename}"? This action cannot be undone.`
            }
            confirmText={deleteFileMutation.isPending ? 'Deleting...' : 'Delete'}
            confirmButtonClass="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          />
        </div>
        </Layout>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

export default function FilesPage() {
  return <FilesPageContent />;
}