'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useFiles, useDeleteFile, useDownloadFile } from '@/hooks/useFiles';
import { useFolders, useCreateFolder, useDeleteFolder } from '@/hooks/useFolders';
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
  const { can } = usePermissionCheck();
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

  const { data: filesData, isLoading: isLoadingFiles, error: filesError, refetch: refetchFiles } = useFiles({
    application_id: applicationId,
    limit: 100,
  });

  const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
  const { data: foldersData, isLoading: isLoadingFolders, error: foldersError, refetch: refetchFolders } = useFolders({
    parent_id: currentParentId,
    application_id: applicationId,
  });

  const deleteFileMutation = useDeleteFile();
  const { downloadFile } = useDownloadFile();

  const createFolderMutation = useCreateFolder();
  const deleteFolderMutation = useDeleteFolder();

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

    // Add folders (for current parent path)
    // Ensure foldersData is always an array, handling both paginated and direct array responses
    const foldersArray: any[] = Array.isArray(foldersData)
      ? foldersData
      : (foldersData as any)?.items && Array.isArray((foldersData as any).items)
        ? (foldersData as any).items
        : [];
    const folderItems: FolderItem[] = foldersArray.map((f: any) => ({
      id: f.id,
      name: f.name,
      type: 'folder' as const,
      created_at: f.created_at,
      file_count: f.file_count,
    }));
    items.push(...folderItems);

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
          (file.display_name || file.original_filename).toLowerCase().includes(searchTerm.toLowerCase())
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
            (file.display_name || file.original_filename).toLowerCase().includes('contract')
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
          aValue = a.type === 'folder' ? (a as FolderItem).name : ((a as FileItem).display_name || (a as FileItem).original_filename);
        bValue = b.type === 'folder' ? (b as FolderItem).name : ((b as FileItem).display_name || (b as FileItem).original_filename);
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
  }, [filesData?.items, sortField, sortDirection, searchTerm, currentPath, foldersData]);

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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolderMutation.mutateAsync({
      name: newFolderName.trim(),
      parent_id: currentParentId,
      application_id: applicationId,
    });
    setNewFolderName('');
    setShowNewFolderDialog(false);
    refetchFolders();
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
      className="flex items-center gap-1 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-full transition-all duration-200"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? 
          <ChevronUpIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" /> : 
          <ChevronDownIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
      )}
    </button>
  );

  if (isLoadingFiles || isLoadingFolders) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400"></div>
        </div>
      </div>
    );
  }

  if (filesError || foldersError) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowPathIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm font-medium mb-3">Error loading files. Please try again.</p>
          <button
            onClick={() => { refetchFiles(); refetchFolders(); }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600 text-sm">
        <button
          onClick={() => setCurrentPath([])}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 font-medium"
        >
          <HomeIcon className="h-4 w-4 mr-2" />
          Files
        </button>
        {currentPath.map((folder, index) => (
          <div key={folder} className="flex items-center">
            <ChevronRightIcon className="h-4 w-4 mx-2 text-gray-400 dark:text-gray-500" />
            <button
              onClick={() => handleBreadcrumbClick(index + 1)}
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 capitalize transition-colors duration-200 font-medium"
            >
              {folder}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {currentPath.length > 0 && (
              <button
                onClick={handleGoBack}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200"
                title="Go back"
              >
                ←
              </button>
            )}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{currentItems.length} items</span>
            {selectedItems.size > 0 && (
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">({selectedItems.size} selected)</span>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent w-64 transition-all duration-200 shadow-sm"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Actions and View Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewFolderDialog(true)}
            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="h-4 w-4" />
            New Folder
          </button>
          
          <div className="flex items-center gap-1 ml-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-600/50'
              }`}
              title="List view"
            >
              <Bars3Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-600/50'
              }`}
              title="Grid view"
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'details' 
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-600/50'
              }`}
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
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {searchTerm ? 'No items match your search' : 'This folder is empty'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              {searchTerm ? 'Try adjusting your search terms' : 'Upload files or create folders to get started'}
            </p>
          </div>
        ) : viewMode === 'details' ? (
          /* Details View */
          <div>
            {/* Header */}
            <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600 px-6 py-3 sticky top-0">
              <div className="flex-1 min-w-0">
                <SortHeader field="name">Name</SortHeader>
              </div>
              <div className="w-24 text-right">
                <SortHeader field="size">Size</SortHeader>
              </div>
              <div className="w-28">
                <SortHeader field="type">Type</SortHeader>
              </div>
              <div className="w-36">
                <SortHeader field="date">Date Modified</SortHeader>
              </div>
              {showActions && <div className="w-20"></div>}
            </div>

            {/* Items List */}
            <div>
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-center px-6 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer select-none border-b border-gray-100 dark:border-gray-700 transition-all duration-200 ${
                    selectedItems.has(item.id) ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20' : ''
                  }`}
                  onClick={(e) => handleItemClick(item, e)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    {item.type === 'folder' ? 
                      getFolderIcon() : 
                      getFileIcon((item as FileItem).mime_type)
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {item.type === 'folder' ? item.name : ((item as FileItem).display_name || (item as FileItem).original_filename)}
                      </p>
                    </div>
                  </div>
                  <div className="w-24 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    {item.type === 'folder' ? 
                      `${item.file_count} items` : 
                      formatBytes((item as FileItem).file_size)
                    }
                  </div>
                  <div className="w-28 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {item.type === 'folder' ? 
                      'Folder' : 
                      (item as FileItem).mime_type.split('/')[1]?.toUpperCase() || 'FILE'
                    }
                  </div>
                  <div className="w-36 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  {showActions && (
                    <div className="w-20 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, item);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
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
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className={`group flex flex-col items-center p-4 rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer select-none transition-all duration-200 hover:shadow-lg hover:scale-105 border border-transparent hover:border-blue-200 dark:hover:border-blue-700 ${
                    selectedItems.has(item.id) ? 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-300 dark:border-blue-600 shadow-md' : ''
                  }`}
                  onClick={(e) => handleItemClick(item, e)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <div className="mb-3 p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm group-hover:shadow-md transition-all duration-200">
                    {item.type === 'folder' ? 
                      getFolderIcon('lg') : 
                      getFileIcon((item as FileItem).mime_type, 'lg')
                    }
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-1" title={
                      item.type === 'folder' ? item.name : ((item as FileItem).display_name || (item as FileItem).original_filename)
            }>
              {item.type === 'folder' ? item.name : ((item as FileItem).display_name || (item as FileItem).original_filename)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
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
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className={`group flex items-center px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer select-none transition-all duration-200 ${
                  selectedItems.has(item.id) ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20' : ''
                }`}
                onClick={(e) => handleItemClick(item, e)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm group-hover:shadow-md transition-all duration-200">
                    {item.type === 'folder' ? 
                      getFolderIcon() : 
                      getFileIcon((item as FileItem).mime_type)
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {item.type === 'folder' ? item.name : ((item as FileItem).display_name || (item as FileItem).original_filename)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
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
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl py-2 z-50 min-w-48 backdrop-blur-sm"
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
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-200"
              >
                <EyeIcon className="h-4 w-4 mr-3 text-blue-600 dark:text-blue-400" />
                Preview
              </button>
              <button
                onClick={() => {
                  handleDownload(contextMenu.item as FileItem);
                  setContextMenu(null);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-200"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-3 text-green-600 dark:text-green-400" />
                Download
              </button>
              {(can(ResourceType.FILE, PermissionAction.DELETE) || (contextMenu.item as FileItem).uploaded_by === user?.id) && (
                <>
                  <hr className="my-2 border-gray-200 dark:border-gray-600" />
                  <button
                    onClick={() => {
                      setFileToDelete(contextMenu.item as FileItem);
                      setContextMenu(null);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
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
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-200"
              >
                <FolderIcon className="h-4 w-4 mr-3 text-blue-600 dark:text-blue-400" />
                Open
              </button>
              <hr className="my-2 border-gray-200 dark:border-gray-600" />
              <button
                onClick={async () => {
                  if (contextMenu?.item.type === 'folder') {
                    await deleteFolderMutation.mutateAsync(contextMenu.item.id);
                    refetchFolders();
                  }
                  setContextMenu(null);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent mb-6 transition-all duration-200 shadow-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-4">
                <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete File</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-gray-100">"{fileToDelete.display_name || fileToDelete.original_filename}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}