'use client';

import { useState, useMemo } from 'react';
import { useFiles, useDeleteFile, useDownloadFile } from '@/hooks/useFiles';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { ResourceType, PermissionAction } from '@/types/permissions';
import { File } from '@/types/models';
import {
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Bars3Icon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { formatBytes, formatDate } from '@/lib/utils';
import FilePreview from './FilePreview';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface FileExplorerViewProps {
  applicationId?: string;
  onFileSelect?: (file: File) => void;
  selectable?: boolean;
  showActions?: boolean;
}

type SortField = 'name' | 'size' | 'type' | 'date';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

export default function FileExplorerView({
  applicationId,
  onFileSelect,
  selectable = false,
  showActions = true
}: FileExplorerViewProps) {
  const { user } = useAuth();
  const { can } = usePermissionCheck();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);

  const { data: filesData, isLoading, error } = useFiles({
    application_id: applicationId,
    limit: 100,
  });

  const deleteFileMutation = useDeleteFile();
  const { downloadFile } = useDownloadFile();

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-12 w-12'
    };

    const iconClass = `${sizeClasses[size]} text-gray-500`;

    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className={iconClass} />;
    }
    if (mimeType.startsWith('video/')) {
      return <FilmIcon className={iconClass} />;
    }
    if (mimeType.startsWith('audio/')) {
      return <MusicalNoteIcon className={iconClass} />;
    }
    if (mimeType === 'application/pdf') {
      return <DocumentTextIcon className={`${iconClass} text-red-500`} />;
    }
    if (mimeType.includes('word')) {
      return <DocumentTextIcon className={`${iconClass} text-blue-500`} />;
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return <TableCellsIcon className={`${iconClass} text-green-500`} />;
    }
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return <PresentationChartBarIcon className={`${iconClass} text-orange-500`} />;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return <ArchiveBoxIcon className={iconClass} />;
    }
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
      return <CodeBracketIcon className={iconClass} />;
    }
    return <DocumentIcon className={iconClass} />;
  };

  // Sort files
  const sortedFiles = useMemo(() => {
    if (!filesData?.items) return [];

    const files = [...filesData.items];
    
    files.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = (a.display_name || a.original_filename).toLowerCase();
        bValue = (b.display_name || b.original_filename).toLowerCase();
          break;
        case 'size':
          aValue = a.file_size;
          bValue = b.file_size;
          break;
        case 'type':
          aValue = a.mime_type.toLowerCase();
          bValue = b.mime_type.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return files;
  }, [filesData?.items, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFileClick = (file: File, event: React.MouseEvent) => {
    if (selectable) {
      if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(file.id)) {
          newSelected.delete(file.id);
        } else {
          newSelected.add(file.id);
        }
        setSelectedFiles(newSelected);
      } else {
        // Single select
        setSelectedFiles(new Set([file.id]));
        onFileSelect?.(file);
      }
    } else {
      setPreviewFile(file);
    }
  };

  const handleDoubleClick = (file: File) => {
    setPreviewFile(file);
  };

  const handleDelete = async () => {
    if (fileToDelete) {
      await deleteFileMutation.mutateAsync(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  const handleDownload = async (file: File) => {
    await downloadFile(file.id, file.display_name || file.original_filename);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider transition-colors duration-200"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? 
          <ChevronUpIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" /> : 
          <ChevronDownIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
      )}
    </button>
  );

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

  const files = sortedFiles;

  if (files.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full w-fit mx-auto mb-4">
          <DocumentIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No files found</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{files.length} items</span>
          {selectedFiles.size > 0 && (
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
              {selectedFiles.size} selected
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              viewMode === 'list' 
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="List view"
          >
            <Bars3Icon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              viewMode === 'grid' 
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Grid view"
          >
            <Squares2X2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* List View */
        <div className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600 px-6 py-3">
            <div className="flex-1 min-w-0">
              <SortHeader field="name">Name</SortHeader>
            </div>
            <div className="w-24 text-right">
              <SortHeader field="size">Size</SortHeader>
            </div>
            <div className="w-32">
              <SortHeader field="type">Type</SortHeader>
            </div>
            <div className="w-36">
              <SortHeader field="date">Date Modified</SortHeader>
            </div>
            {showActions && <div className="w-32"></div>}
          </div>

          {/* File List */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {files.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center px-6 py-4 hover:bg-blue-50 dark:hover:bg-gray-700/50 cursor-pointer select-none transition-colors duration-200 ${
                  selectedFiles.has(file.id) ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                }`}
                onClick={(e) => handleFileClick(file, e)}
                onDoubleClick={() => handleDoubleClick(file)}
              >
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {file.display_name || file.original_filename}
                    </p>
                  </div>
                </div>
                <div className="w-24 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  {formatBytes(file.file_size)}
                </div>
                <div className="w-32 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {file.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                </div>
                <div className="w-36 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {new Date(file.created_at).toLocaleDateString()}
                </div>
                {showActions && (
                  <div className="w-32 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
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
                    {(can(ResourceType.FILE, PermissionAction.DELETE) || file.uploaded_by === user?.id) && (
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
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
            {files.map((file) => (
              <div
                key={file.id}
                className={`group flex flex-col items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer select-none transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 ${
                  selectedFiles.has(file.id) ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500' : ''
                }`}
                onClick={(e) => handleFileClick(file, e)}
                onDoubleClick={() => handleDoubleClick(file)}
              >
                <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                  {getFileIcon(file.mime_type, 'lg')}
                </div>
                <div className="text-center min-w-0 w-full mb-3">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-1" title={file.display_name || file.original_filename}>
              {file.display_name || file.original_filename}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {formatBytes(file.file_size)}
                  </p>
                </div>
                {showActions && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                      title="Preview"
                    >
                      <EyeIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition-colors duration-200"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-3 w-3" />
                    </button>
                    {(can(ResourceType.FILE, PermissionAction.DELETE) || file.uploaded_by === user?.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileToDelete(file);
                        }}
                        className="p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 rounded-lg transition-colors duration-200"
                        title="Delete"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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