'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useFiles, useDeleteFile, useDownloadFile } from '@/hooks/useFiles';
import { useAuth } from '@/hooks/useAuth';
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
  Squares2X2Icon,
  FolderIcon,
  HomeIcon,
  EllipsisVerticalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { formatBytes, formatDate } from '@/lib/utils';
import FilePreview from './FilePreview';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface AdvancedFileExplorerProps {
  applicationId?: string;
  onFileSelect?: (file: File) => void;
  selectable?: boolean;
  showActions?: boolean;
}

type SortField = 'name' | 'size' | 'type' | 'date';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid' | 'details';

export default function AdvancedFileExplorer({
  applicationId,
  onFileSelect,
  selectable = false,
  showActions = true
}: AdvancedFileExplorerProps) {
  const { user } = useAuth();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: File;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const { data: filesData, isLoading, error, refetch } = useFiles({
    application_id: applicationId,
    limit: 100,
  });

  const deleteFileMutation = useDeleteFile();
  const { downloadFile } = useDownloadFile();

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get file icon with color coding
  const getFileIcon = (mimeType: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-12 w-12'
    };

    const iconClass = `${sizeClasses[size]}`;

    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className={`${iconClass} text-purple-500`} />;
    }
    if (mimeType.startsWith('video/')) {
      return <FilmIcon className={`${iconClass} text-red-500`} />;
    }
    if (mimeType.startsWith('audio/')) {
      return <MusicalNoteIcon className={`${iconClass} text-green-500`} />;
    }
    if (mimeType === 'application/pdf') {
      return <DocumentTextIcon className={`${iconClass} text-red-600`} />;
    }
    if (mimeType.includes('word')) {
      return <DocumentTextIcon className={`${iconClass} text-blue-600`} />;
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return <TableCellsIcon className={`${iconClass} text-green-600`} />;
    }
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return <PresentationChartBarIcon className={`${iconClass} text-orange-600`} />;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return <ArchiveBoxIcon className={`${iconClass} text-yellow-600`} />;
    }
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
      return <CodeBracketIcon className={`${iconClass} text-gray-600`} />;
    }
    return <DocumentIcon className={`${iconClass} text-gray-500`} />;
  };

  // Filter and sort files
  const processedFiles = useMemo(() => {
    if (!filesData?.items) return [];

    let files = [...filesData.items];

    // Filter by search term
    if (searchTerm) {
      files = files.filter(file =>
        file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort files
    files.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.original_filename.toLowerCase();
          bValue = b.original_filename.toLowerCase();
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
  }, [filesData?.items, sortField, sortDirection, searchTerm]);

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
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(file.id)) {
          newSelected.delete(file.id);
        } else {
          newSelected.add(file.id);
        }
        setSelectedFiles(newSelected);
      } else {
        setSelectedFiles(new Set([file.id]));
        onFileSelect?.(file);
      }
    } else {
      setPreviewFile(file);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, file: File) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      file
    });
  };

  const handleDelete = async () => {
    if (fileToDelete) {
      await deleteFileMutation.mutateAsync(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  const handleDownload = async (file: File) => {
    await downloadFile(file.id, file.original_filename);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left hover:bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-700 uppercase tracking-wider w-full"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? 
          <ChevronUpIcon className="h-3 w-3" /> : 
          <ChevronDownIcon className="h-3 w-3" />
      )}
    </button>
  );

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
        <button
          onClick={() => refetch()}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mx-auto"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (processedFiles.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">
          {searchTerm ? 'No files match your search' : 'No files found'}
        </p>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear search
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm">
        <HomeIcon className="h-4 w-4 text-gray-500 mr-2" />
        <span className="text-gray-600">Files</span>
        {applicationId && (
          <>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900">Application Files</span>
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{processedFiles.length} items</span>
            {selectedFiles.size > 0 && (
              <span className="text-sm text-blue-600">({selectedFiles.size} selected)</span>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="List view"
          >
            <Bars3Icon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="Grid view"
          >
            <Squares2X2Icon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('details')}
            className={`p-2 rounded ${viewMode === 'details' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="Details view"
          >
            <Bars3Icon className="h-4 w-4 rotate-90" />
          </button>
        </div>
      </div>

      {/* File Content */}
      <div className="overflow-auto max-h-96">
        {viewMode === 'details' ? (
          /* Details View (Windows Explorer style) */
          <div>
            {/* Header */}
            <div className="flex items-center bg-gray-50 border-b border-gray-200 px-4 py-2 sticky top-0">
              <div className="flex-1 min-w-0">
                <SortHeader field="name">Name</SortHeader>
              </div>
              <div className="w-20 text-right">
                <SortHeader field="size">Size</SortHeader>
              </div>
              <div className="w-24">
                <SortHeader field="type">Type</SortHeader>
              </div>
              <div className="w-32">
                <SortHeader field="date">Date Modified</SortHeader>
              </div>
              {showActions && <div className="w-16"></div>}
            </div>

            {/* File List */}
            <div>
              {processedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer select-none border-b border-gray-50 ${
                    selectedFiles.has(file.id) ? 'bg-blue-100' : ''
                  }`}
                  onClick={(e) => handleFileClick(file, e)}
                  onDoubleClick={() => setPreviewFile(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {getFileIcon(file.mime_type)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.original_filename}
                      </p>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm text-gray-500">
                    {formatBytes(file.file_size)}
                  </div>
                  <div className="w-24 text-sm text-gray-500">
                    {file.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </div>
                  <div className="w-32 text-sm text-gray-500">
                    {new Date(file.created_at).toLocaleDateString()}
                  </div>
                  {showActions && (
                    <div className="w-16 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, file);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <EllipsisVerticalIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {processedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`group flex flex-col items-center p-3 rounded-lg hover:bg-blue-50 cursor-pointer select-none ${
                    selectedFiles.has(file.id) ? 'bg-blue-100' : ''
                  }`}
                  onClick={(e) => handleFileClick(file, e)}
                  onDoubleClick={() => setPreviewFile(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <div className="mb-2">
                    {getFileIcon(file.mime_type, 'lg')}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs font-medium text-gray-900 truncate" title={file.original_filename}>
                      {file.original_filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatBytes(file.file_size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="divide-y divide-gray-100">
            {processedFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer select-none ${
                  selectedFiles.has(file.id) ? 'bg-blue-100' : ''
                }`}
                onClick={(e) => handleFileClick(file, e)}
                onDoubleClick={() => setPreviewFile(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file.mime_type)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(file.file_size)} • {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-48"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => {
              setPreviewFile(contextMenu.file);
              setContextMenu(null);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <EyeIcon className="h-4 w-4 mr-3" />
            Preview
          </button>
          <button
            onClick={() => {
              handleDownload(contextMenu.file);
              setContextMenu(null);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-3" />
            Download
          </button>
          {(user?.role === 'admin' || contextMenu.file.uploaded_by === user?.id) && (
            <>
              <hr className="my-1" />
              <button
                onClick={() => {
                  setFileToDelete(contextMenu.file);
                  setContextMenu(null);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-3" />
                Delete
              </button>
            </>
          )}
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
          message={`Are you sure you want to delete "${fileToDelete.original_filename}"?`}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}