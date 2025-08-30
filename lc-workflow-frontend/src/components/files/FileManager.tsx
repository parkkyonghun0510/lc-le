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
    downloadFile(file.id, file.original_filename);
  };

  const files = filesData?.items || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm">Error loading files. Please try again.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Files ({files.length})
          </h3>
          {showUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              <PlusIcon className="h-4 w-4" />
              Add File
            </button>
          )}
        </div>

        {/* File List */}
        {files.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No files uploaded</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <DocumentIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(file.file_size)} • {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="text-gray-600 hover:text-gray-900 p-1"
                    title="Preview"
                  >
                    <EyeIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-3 w-3" />
                  </button>
                  {(user?.role === 'admin' || file.uploaded_by === user?.id) && (
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="text-red-600 hover:text-red-900 p-1"
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
            message={`Are you sure you want to delete "${fileToDelete.original_filename}"?`}
            confirmText="Delete"
            confirmButtonClass="bg-red-600 hover:bg-red-700"
          />
        )}
      </div>
    );
  }

  // Full file manager view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Files {applicationId && `for Application`}
        </h3>
        {showUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Upload File
          </button>
        )}
      </div>

      {/* File Grid */}
      {files.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No files uploaded</p>
          {showUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Upload your first file
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <DocumentIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="text-gray-600 hover:text-gray-900 p-1"
                    title="Preview"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  {(user?.role === 'admin' || file.uploaded_by === user?.id) && (
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                  {file.original_filename}
                </h4>
                <p className="text-xs text-gray-500 mb-2">
                  {formatBytes(file.file_size)} • {file.mime_type}
                </p>
                <p className="text-xs text-gray-500">
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
          message={`Are you sure you want to delete "${fileToDelete.original_filename}"?`}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}