'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui';
import { EyeIcon, ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { DocumentDuplicateIcon } from '@heroicons/react/24/solid';
import ImageThumbnail from '@/components/files/ImageThumbnail';
import type { File as ApiFile } from '@/types/models';
import { cn } from '@/lib/utils';

interface DocumentGridProps {
  files: ApiFile[];
  folders: Array<{ id: string; name: string }>;
  onPreview: (file: ApiFile, fileList: ApiFile[]) => void;
  onDownload: (fileId: string, filename: string) => void;
  className?: string;
}

interface FolderSectionProps {
  folder: { id: string; name: string } | null;
  files: ApiFile[];
  onPreview: (file: ApiFile, fileList: ApiFile[]) => void;
  onDownload: (fileId: string, filename: string) => void;
  isImageFile: (file: ApiFile) => boolean;
}

const isImageFile = (f: ApiFile) => {
  const byMime = typeof f.mime_type === 'string' && f.mime_type.toLowerCase().startsWith('image/');
  const byExt = typeof (f.display_name || f.original_filename) === 'string' && 
    /\.(jpg|jpeg|png|gif|webp|bmp|tiff|heic)$/i.test(f.display_name || f.original_filename);
  return byMime || byExt;
};

function FolderSection({ folder, files, onPreview, onDownload, isImageFile }: FolderSectionProps) {
  const imageFiles = files.filter(isImageFile);
  const otherFiles = files.filter(f => !isImageFile(f));
  
  if (files.length === 0) return null;

  return (
    <Card variant="outlined" padding="none" className="overflow-hidden">
      {/* Folder Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-lg shadow-md">
            <DocumentDuplicateIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {folder?.name || 'Other Files'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {files.length} files ({imageFiles.length} images, {otherFiles.length} documents)
            </p>
          </div>
        </div>
      </div>

      {/* Folder Content */}
      <div className="p-6 space-y-6">
        {/* Images */}
        {imageFiles.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <div className="w-2 h-2 bg-teal-500 rounded-full mr-2"></div>
              រូបភាព ({imageFiles.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {imageFiles.map((file) => (
                <div
                  key={file.id}
                  className="group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                  onClick={() => onPreview(file, imageFiles)}
                >
                  <ImageThumbnail
                    file={file}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg">
                        <EyeIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-medium truncate">
                      {file.display_name || file.original_filename}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {otherFiles.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              ឯកសារ ({otherFiles.length})
            </h4>
            <div className="space-y-2">
              {otherFiles.map((file) => (
                <div
                  key={file.id}
                  className="group flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg shadow-md">
                      <DocumentTextIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {file.display_name || file.original_filename}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {file.mime_type} • {file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'Unknown size'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPreview(file, otherFiles)}
                      className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 hover:shadow-md text-sm"
                    >
                      <EyeIcon className="w-3 h-3 mr-1.5" />
                      មើល
                    </button>
                    <button
                      onClick={() => onDownload(file.id, file.original_filename || 'document')}
                      className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200 hover:shadow-md text-sm"
                    >
                      <ArrowDownTrayIcon className="w-3 h-3 mr-1.5" />
                      ទាញយក
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function DocumentGrid({ files, folders, onPreview, onDownload, className }: DocumentGridProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <Card padding="lg" className={cn('text-center', className)}>
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl w-fit mx-auto mb-4">
          <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          មិនមានឯកសារដែលបានផ្ទុកឡើង
        </p>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Known folders first: borrower, guarantor, collateral */}
      {['borrower', 'guarantor', 'collateral'].map((role) => {
        const folder = folders.find(f => f.name.toLowerCase() === role);
        const folderFiles = files.filter(f => f.folder_id === folder?.id);
        if (!folder && folderFiles.length === 0) return null;
        
        return (
          <FolderSection
            key={role}
            folder={folder || { id: role, name: role }}
            files={folderFiles}
            onPreview={onPreview}
            onDownload={onDownload}
            isImageFile={isImageFile}
          />
        );
      })}

      {/* Other folders */}
      {folders
        .filter(f => !['borrower', 'guarantor', 'collateral'].includes(f.name.toLowerCase()))
        .map(folder => {
          const folderFiles = files.filter(f => f.folder_id === folder.id);
          return (
            <FolderSection
              key={folder.id}
              folder={folder}
              files={folderFiles}
              onPreview={onPreview}
              onDownload={onDownload}
              isImageFile={isImageFile}
            />
          );
        })}

      {/* Orphan files (no folder) */}
      {(() => {
        const orphanFiles = files.filter(f => !f.folder_id);
        if (orphanFiles.length === 0) return null;
        
        return (
          <FolderSection
            key="orphan"
            folder={null}
            files={orphanFiles}
            onPreview={onPreview}
            onDownload={onDownload}
            isImageFile={isImageFile}
          />
        );
      })()}
    </div>
  );
}