'use client';

import { useState } from 'react';
import { useFiles, useDeleteFile, useDownloadFile } from '@/hooks/useFiles';
import { File } from '@/types/models';
import { 
  DocumentIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  EyeIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { formatBytes, formatDate } from '@/lib/utils';
import FilePreview from './FilePreview';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface FileBrowserProps {
  applicationId?: string;
  onFileSelect?: (file: File) => void;
  selectable?: boolean;
  showActions?: boolean;
}

export default function FileBrowser({ 
  applicationId, 
  onFileSelect, 
  selectable = false,
  showActions = true 
}: FileBrowserProps) {
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);

  const { data: filesData, isLoading, error } = useFiles({
    application_id: applicationId,
    limit: 100,
  });

  const deleteFileMutation = useDeleteFile();
  const { downloadFile } = useDownloadFile();

  const handleDelete = async () => {
    if (fileToDelete) {
      await deleteFileMutation.mutateAsync(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  const handleDownload = async (file: File) => {
    await downloadFile(file.id, file.original_filename);
  };

  const handleFileClick = (file: File) => {
    if (selectable && onFileSelect) {
      onFileSelect(file);
    } else {
      setPreviewFile(file);
    }
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

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No files found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
            selectable ? 'cursor-pointer' : ''
          }`}
          onClick={() => handleFileClick(file)}
        >
          <div className="flex items-center flex-1 min-w-0">
            <DocumentIcon className="h-6 w-6 text-gray-400 mr-3 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.original_filename}
              </p>
              <p className="text-xs text-gray-500">
                {formatBytes(file.file_size)} • {formatDate(file.created_at)}
              </p>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewFile(file);
                }}
                className="text-gray-600 hover:text-gray-900 p-1"
                title="Preview"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(file);
                }}
                className="text-blue-600 hover:text-blue-900 p-1"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFileToDelete(file);
                }}
                className="text-red-600 hover:text-red-900 p-1"
                title="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* File Preview */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Delete Confirmation */}
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