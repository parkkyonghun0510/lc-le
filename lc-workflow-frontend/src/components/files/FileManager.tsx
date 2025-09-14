'use client';

import { useState } from 'react';
import { useFiles, useDeleteFile, useDownloadFile } from '@/hooks/useFiles';
import { useAuth } from '@/hooks/useAuth';
import { File } from '@/types/models';
import { 
  DocumentIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { formatBytes, formatDate } from '@/lib/utils';
import FileUploadModal from './FileUploadModal';
import FilePreview from './FilePreview';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface FileManagerProps {
  applicationId?: string;
  showUpload?: boolean;
  compact?: boolean;
  maxFiles?: number;
}

export default function FileManager({ 
  applicationId, 
  showUpload = true, 
  compact = false,
  maxFiles 
}: FileManagerProps) {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const { data: filesData, isLoading, error } = useFiles({
    application_id: applicationId,
    limit: maxFiles || 50,
  });

  const deleteFileMutation = useDeleteFile();
  const { downloadFile } = useDownloadFile();

  const handleDelete = async () => {
    if (fileToDelete) {
      await deleteFileMutation.mutateAsync(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  const handleDownload = (file: File) => {
    downloadFile(file.id, file.display_name || file.original_filename);
  };

  const files = filesData?.items || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full w-fit mx-auto mb-4">
          <DocumentIcon className="h-8 w-8 text-red-500 dark:text-red-400" />
        </div>
        <p className="text-red-600 dark:text-red-400 text-sm font-medium">Error loading files. Please try again.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Files ({files.length})
          </h3>
          {showUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center gap-2 font-medium transition-colors duration-200"
            >
              <PlusIcon className="h-4 w-4" />
              Add File
            </button>
          )}
        </div>

        {/* File List */}
        {files.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full w-fit mx-auto mb-4">
              <DocumentIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No files uploaded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl mr-3 flex-shrink-0">
                    <DocumentIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                      {file.display_name || file.original_filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{formatBytes(file.file_size)}</span>
                      <span className="text-gray-300 dark:text-gray-600 mx-1">•</span>
                      <span>{formatDate(file.created_at)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                    title="Preview"
                  >
                    <EyeIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition-colors duration-200"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-3 w-3" />
                  </button>
                  {(user?.role === 'admin' || file.uploaded_by === user?.id) && (
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 rounded-lg transition-colors duration-200"
                      title="Delete"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        {showUploadModal && (
          <FileUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            applicationId={applicationId}
          />
        )}

        {previewFile && (
          <FilePreview
            file={previewFile}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}

        {fileToDelete && (
          <ConfirmDialog
            isOpen={!!fileToDelete}
            onClose={() => setFileToDelete(null)}
            onConfirm={handleDelete}
            title="Delete File"
            message={`Are you sure you want to delete "${fileToDelete.display_name || fileToDelete.original_filename}"?`}
            confirmText="Delete"
            confirmButtonClass="bg-red-600 hover:bg-red-700"
          />
        )}
      </div>
    );
  }

  // Full file manager view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Files ({files.length})
        </h3>
        {showUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <PlusIcon className="h-4 w-4" />
            Upload File
          </button>
        )}
      </div>

      {/* File Grid */}
      {files.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-fit mx-auto mb-6">
            <DocumentIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No files</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Get started by uploading a file.</p>
          {showUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 flex items-center gap-2 mx-auto font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <PlusIcon className="h-5 w-5" />
              Upload File
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {files.map((file) => (
            <div
              key={file.id}
              className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <DocumentIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                    title="Preview"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition-colors duration-200"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  {(user?.role === 'admin' || file.uploaded_by === user?.id) && (
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 rounded-lg transition-colors duration-200"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-2">
                  {file.display_name || file.original_filename}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  {formatBytes(file.file_size)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(file.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showUploadModal && (
        <FileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          applicationId={applicationId}
        />
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {fileToDelete && (
        <ConfirmDialog
          isOpen={!!fileToDelete}
          onClose={() => setFileToDelete(null)}
          onConfirm={handleDelete}
          title="Delete File"
          message={`Are you sure you want to delete "${fileToDelete.display_name || fileToDelete.original_filename}"?`}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}