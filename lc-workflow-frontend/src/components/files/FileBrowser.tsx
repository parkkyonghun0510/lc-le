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
    await downloadFile(file.id, file.display_name || file.original_filename);
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

  if (files.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full w-fit mx-auto mb-4">
          <FolderIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No files found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <div
          key={file.id}
          className={`group flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md ${
            selectable ? 'cursor-pointer' : ''
          }`}
          onClick={() => handleFileClick(file)}
        >
          <div className="flex items-center flex-1 min-w-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl mr-4 flex-shrink-0">
              <DocumentIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
          
          {showActions && (
            <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewFile(file);
                }}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg transition-colors duration-200"
                title="Preview"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(file);
                }}
                className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition-colors duration-200"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFileToDelete(file);
                }}
                className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 rounded-lg transition-colors duration-200"
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
          message={`Are you sure you want to delete "${fileToDelete.display_name || fileToDelete.original_filename}"?`}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}