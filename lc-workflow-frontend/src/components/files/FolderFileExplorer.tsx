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
  ArrowPathIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { formatBytes, formatDate } from '@/lib/utils';
import FilePreview from './FilePreview';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  created_at: string;
  file_count: number;
}

interface FileItem extends File {
  type: 'file';
}

type ExplorerItem = FolderItem | FileItem;

interface FolderFileExplorerProps {
  applicationId?: string;
  onFileSelect?: (file: File) => void;
  selectable?: boolean;
  showActions?: boolean;
}

type SortField = 'name' | 'size' | 'type' | 'date';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid' | 'details';

export default function FolderFileExplorer({
  applicationId,
  onFileSelect,
  selectable = false,
  showActions = true
}: FolderFileExplorerProps) {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: ExplorerItem;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const { data: filesData, isLoading, error, refetch } = useFiles({
    application_id: applicationId,
    limit: 100,
  });

  const deleteFileMutation = useDeleteFile();
  const { downloadFile } = useDownloadFile();

  // Mock folder structure - in real implementation, this would come from API
  const mockFolders: FolderItem[] = [
    {
      id: 'documents',
      name: 'Documents',
      type: 'folder',
      created_at: new Date().toISOString(),
      file_count: 5
    },
    {
      id: 'images',
      name: 'Images',
      type: 'folder',
      created_at: new Date().toISOString(),
      file_count: 12
    },
    {
      id: 'contracts',
      name: 'Contracts',
      type: 'folder',
      created_at: new Date().toISOString(),
      file_count: 3
    }
  ];

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

  const getFolderIcon = (size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-12 w-12'
    };
    return <FolderIcon className={`${sizeClasses[size]} text-blue-500`} />;
  };

  // Get current items (folders + files)
  const currentItems = useMemo(() => {
    const items: ExplorerItem[] = [];

    // Add folders (only at root level for now)
    if (currentPath.length === 0) {
      items.push(...mockFolders);
    }

    // Add files
    if (filesData?.items) {
      const files: FileItem[] = filesData.items.map(file => ({
        ...file,
        type: 'file' as const
      }));

      // Filter files based on current path and search
      let filteredFiles = files;
      
      if (searchTerm) {
        filteredFiles = filteredFiles.filter(file =>
          file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Mock folder filtering - in real implementation, files would have folder_path
      if (currentPath.length > 0) {
        const currentFolder = currentPath[currentPath.length - 1];
        // Filter files by folder (mock implementation)
        if (currentFolder === 'documents') {
          filteredFiles = filteredFiles.filter(file => 
            file.mime_type.includes('pdf') || file.mime_type.includes('word')
          );
        } else if (currentFolder === 'images') {
          filteredFiles = filteredFiles.filter(file => 
            file.mime_type.startsWith('image/')
          );
        } else if (currentFolder === 'contracts') {
          filteredFiles = filteredFiles.filter(file => 
            file.original_filename.toLowerCase().includes('contract')
          );
        }
      }

      items.push(...filteredFiles);
    }

    // Sort items
    items.sort((a, b) => {
      // Folders first
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;

      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name || (a as FileItem).original_filename;
          bValue = b.name || (b as FileItem).original_filename;
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
          break;
        case 'size':
          if (a.type === 'folder') aValue = 0;
          else aValue = (a as FileItem).file_size;
          if (b.type === 'folder') bValue = 0;
          else bValue = (b as FileItem).file_size;
          break;
        case 'type':
          aValue = a.type === 'folder' ? 'folder' : (a as FileItem).mime_type;
          bValue = b.type === 'folder' ? 'folder' : (b as FileItem).mime_type;
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

    return items;
  }, [filesData?.items, sortField, sortDirection, searchTerm, currentPath, mockFolders]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleItemClick = (item: ExplorerItem, event: React.MouseEvent) => {
    if (item.type === 'folder') {
      // Navigate into folder
      setCurrentPath([...currentPath, item.id]);
      setSelectedItems(new Set());
    } else {
      // Handle file selection
      if (selectable) {
        if (event.ctrlKey || event.metaKey) {
          const newSelected = new Set(selectedItems);
          if (newSelected.has(item.id)) {
            newSelected.delete(item.id);
          } else {
            newSelected.add(item.id);
          }
          setSelectedItems(newSelected);
        } else {
          setSelectedItems(new Set([item.id]));
          onFileSelect?.(item as FileItem);
        }
      } else {
        setPreviewFile(item as FileItem);
      }
    }
  };

  const handleItemDoubleClick = (item: ExplorerItem) => {
    if (item.type === 'folder') {
      setCurrentPath([...currentPath, item.id]);
    } else {
      setPreviewFile(item as FileItem);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, item: ExplorerItem) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      item
    });
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  const handleGoBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      // In real implementation, this would call an API
      console.log('Creating folder:', newFolderName);
      setNewFolderName('');
      setShowNewFolderDialog(false);
    }
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm">
        <button
          onClick={() => setCurrentPath([])}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <HomeIcon className="h-4 w-4 mr-2" />
          Files
        </button>
        {currentPath.map((folder, index) => (
          <div key={folder} className="flex items-center">
            <ChevronRightIcon className="h-4 w-4 mx-2 text-gray-400" />
            <button
              onClick={() => handleBreadcrumbClick(index + 1)}
              className="text-gray-600 hover:text-gray-900 capitalize"
            >
              {folder}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {currentPath.length > 0 && (
              <button
                onClick={handleGoBack}
                className="p-1 text-gray-500 hover:text-gray-700 rounded"
                title="Go back"
              >
                ←
              </button>
            )}
            <span className="text-sm text-gray-600">{currentItems.length} items</span>
            {selectedItems.size > 0 && (
              <span className="text-sm text-blue-600">({selectedItems.size} selected)</span>
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

        {/* Actions and View Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolderDialog(true)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            New Folder
          </button>
          
          <div className="flex items-center gap-1 ml-2">
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
      </div>

      {/* File Content */}
      <div className="overflow-auto max-h-96">
        {currentItems.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No items match your search' : 'This folder is empty'}
            </p>
          </div>
        ) : viewMode === 'details' ? (
          /* Details View */
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

            {/* Items List */}
            <div>
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer select-none border-b border-gray-50 ${
                    selectedItems.has(item.id) ? 'bg-blue-100' : ''
                  }`}
                  onClick={(e) => handleItemClick(item, e)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {item.type === 'folder' ? 
                      getFolderIcon() : 
                      getFileIcon((item as FileItem).mime_type)
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.type === 'folder' ? item.name : (item as FileItem).original_filename}
                      </p>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm text-gray-500">
                    {item.type === 'folder' ? 
                      `${item.file_count} items` : 
                      formatBytes((item as FileItem).file_size)
                    }
                  </div>
                  <div className="w-24 text-sm text-gray-500">
                    {item.type === 'folder' ? 
                      'Folder' : 
                      (item as FileItem).mime_type.split('/')[1]?.toUpperCase() || 'FILE'
                    }
                  </div>
                  <div className="w-32 text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  {showActions && (
                    <div className="w-16 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, item);
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
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className={`group flex flex-col items-center p-3 rounded-lg hover:bg-blue-50 cursor-pointer select-none ${
                    selectedItems.has(item.id) ? 'bg-blue-100' : ''
                  }`}
                  onClick={(e) => handleItemClick(item, e)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <div className="mb-2">
                    {item.type === 'folder' ? 
                      getFolderIcon('lg') : 
                      getFileIcon((item as FileItem).mime_type, 'lg')
                    }
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs font-medium text-gray-900 truncate" title={
                      item.type === 'folder' ? item.name : (item as FileItem).original_filename
                    }>
                      {item.type === 'folder' ? item.name : (item as FileItem).original_filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.type === 'folder' ? 
                        `${item.file_count} items` : 
                        formatBytes((item as FileItem).file_size)
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="divide-y divide-gray-100">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer select-none ${
                  selectedItems.has(item.id) ? 'bg-blue-100' : ''
                }`}
                onClick={(e) => handleItemClick(item, e)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.type === 'folder' ? 
                    getFolderIcon() : 
                    getFileIcon((item as FileItem).mime_type)
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.type === 'folder' ? item.name : (item as FileItem).original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.type === 'folder' ? 
                        `${item.file_count} items • ${formatDate(item.created_at)}` : 
                        `${formatBytes((item as FileItem).file_size)} • ${formatDate(item.created_at)}`
                      }
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
          {contextMenu.item.type === 'file' ? (
            <>
              <button
                onClick={() => {
                  setPreviewFile(contextMenu.item as FileItem);
                  setContextMenu(null);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <EyeIcon className="h-4 w-4 mr-3" />
                Preview
              </button>
              <button
                onClick={() => {
                  handleDownload(contextMenu.item as FileItem);
                  setContextMenu(null);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-3" />
                Download
              </button>
              {(user?.role === 'admin' || (contextMenu.item as FileItem).uploaded_by === user?.id) && (
                <>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setFileToDelete(contextMenu.item as FileItem);
                      setContextMenu(null);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-3" />
                    Delete
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  handleItemClick(contextMenu.item, {} as React.MouseEvent);
                  setContextMenu(null);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <FolderIcon className="h-4 w-4 mr-3" />
                Open
              </button>
              <hr className="my-1" />
              <button
                onClick={() => {
                  // Delete folder logic
                  setContextMenu(null);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-3" />
                Delete Folder
              </button>
            </>
          )}
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
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
          message={`Are you sure you want to delete "${fileToDelete.original_filename}"?`}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}