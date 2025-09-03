'use client';

import React from 'react';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { DocumentType, DocumentTypeInfo } from '../types';
import { File as ApiFile } from '@/types/models';
import { useUploadFile } from '@/hooks/useFiles';

interface DocumentAttachmentStepProps {
  documentTypes: DocumentTypeInfo[];
  uploadedFiles: ApiFile[];
  isLoadingFiles: boolean;
  onOpenModal: (docType: DocumentType) => void;
  onDeleteFile?: (fileId: string) => void;
}

export const DocumentAttachmentStep: React.FC<DocumentAttachmentStepProps> = ({
  documentTypes,
  uploadedFiles,
  isLoadingFiles,
  onOpenModal,
  onDeleteFile,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {documentTypes.map((docType) => (
          <div
            key={docType.type}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {docType.label}
              </h3>
              <button
                onClick={() => onOpenModal(docType.type)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Upload Files
              </button>
            </div>
          </div>
        ))}
      </div>

      {isLoadingFiles ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No files uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((file: ApiFile) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {file.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {file.metadata?.documentType || 'Unknown type'}
                      </p>
                    </div>
                  </div>
                  {onDeleteFile && (
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={`Delete ${file.filename}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};