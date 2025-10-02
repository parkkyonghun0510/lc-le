'use client';

import React, { useState, useEffect } from 'react';
import {
  PhotoIcon,
  CameraIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { DocumentType, DocumentTypeInfo } from '../types';
import { File as ApiFile } from '@/types/models';
import { useUploadFile, useCreateFolder, useFolders } from '@/hooks/useFiles';
import { CameraCapture } from '@/components/CameraCapture';
import { isMobileDevice, getDeviceInfo, DeviceInfo } from '@/utils/deviceDetection';
import { toast } from 'react-hot-toast';

// Utility function to format file sizes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

interface DocumentAttachmentStepProps {
  applicationId?: string;
}

export const DocumentAttachmentStep: React.FC<DocumentAttachmentStepProps> = ({
  applicationId,
}) => {
  const uploadMutation = useUploadFile();

  // Document definitions for the upload section
  const docDefs = [
    { id: 'borrower_photo', label: 'រូបថតអ្នកខ្ចី', role: 'borrower' },
    { id: 'borrower_nid_front', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកខ្ចី (មុខ)', role: 'borrower' },
    { id: 'guarantor_photo', label: 'រូបថតអ្នកធានា', role: 'guarantor' },
    { id: 'guarantor_nid_front', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកធានា (មុខ)', role: 'guarantor' },
    { id: 'driver_license', label: 'បណ្ណបើកបរ', role: 'borrower' },
    { id: 'passport', label: 'លិខិតឆ្លងដែន', role: 'borrower' },
    { id: 'business_license', label: 'អាជ្ញាបណ្ណអាជីវកម្ម', role: 'borrower' },
    { id: 'land_title', label: 'បណ្ណកម្មសិទ្ធិដី', role: 'collateral' },
    { id: 'house_photo', label: 'រូបផ្ទះ', role: 'collateral' },
    { id: 'collateral_other', label: 'បញ្ចាំផ្សេងៗ', role: 'collateral' },
  ];

  // Map frontend document IDs to backend document types
  const getBackendDocumentType = (docId: string): 'photos' | 'references' | 'supporting_docs' | 'borrower_photo' | 'borrower_id' | 'borrower_income_proof' | 'guarantor_photo' | 'guarantor_id' | 'guarantor_income_proof' | 'collateral_photo' | 'collateral_document' | 'land_title' | 'contract' | 'other' => {
    const mapping: Record<string, 'photos' | 'references' | 'supporting_docs' | 'borrower_photo' | 'borrower_id' | 'borrower_income_proof' | 'guarantor_photo' | 'guarantor_id' | 'guarantor_income_proof' | 'collateral_photo' | 'collateral_document' | 'land_title' | 'contract' | 'other'> = {
      'borrower_photo': 'borrower_photo',
      'borrower_nid_front': 'borrower_id',
      'guarantor_photo': 'guarantor_photo',
      'guarantor_nid_front': 'guarantor_id',
      'driver_license': 'borrower_id',
      'passport': 'borrower_id',
      'business_license': 'borrower_income_proof',
      'land_title': 'land_title',
      'house_photo': 'collateral_photo',
      'collateral_other': 'collateral_document',
    };
    return mapping[docId] || 'other';
  };

  // Mobile device detection
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [currentDocType, setCurrentDocType] = useState<string | null>(null);

  // Existing state
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
  const [, setDocFiles] = useState<Record<string, File[]>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, ApiFile[]>>({});

  // Upload and folder hooks
  const uploadFileMutation = useUploadFile();
  const createFolderMutation = useCreateFolder();
  const { data: foldersData, refetch: refetchFolders } = useFolders({ application_id: applicationId });
  const folders = foldersData?.items || [];

  // In-memory cache to prevent duplicate folder creation during simultaneous uploads
  const [folderCache, setFolderCache] = useState<Record<string, string>>({});

  // Detect device on mount
  useEffect(() => {
    const detectDevice = async () => {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
    };
    detectDevice();
  }, []);

  // Get or create folder for document role
  const getOrCreateFolder = async (role: string): Promise<string | undefined> => {
    if (!applicationId) return undefined;

    // Map roles to folder names
    const folderNames = {
      borrower: 'Borrower Documents',
      guarantor: 'Guarantor Documents',
      collateral: 'Collateral Documents'
    };

    const folderName = folderNames[role as keyof typeof folderNames];
    if (!folderName) return undefined;

    // Check in-memory cache first to prevent duplicate creation during simultaneous uploads
    const cacheKey = `${applicationId}-${role}`;
    if (folderCache[cacheKey]) {
      console.log(`Using cached folder: ${folderName} (${folderCache[cacheKey]})`);
      return folderCache[cacheKey];
    }

    // Always fetch fresh folder data to check for existing folders
    const { data: currentFoldersData } = await refetchFolders();
    const currentFolders = currentFoldersData?.items || [];

    // Check if folder already exists
    const existingFolder = currentFolders.find(f => f.name === folderName && f.application_id === applicationId);
    if (existingFolder) {
      console.log(`Using existing folder: ${folderName} (${existingFolder.id})`);
      // Cache the folder ID to prevent future duplicates
      setFolderCache(prev => ({ ...prev, [cacheKey]: existingFolder.id }));
      return existingFolder.id;
    }

    // Create new folder
    try {
      console.log(`Creating new folder: ${folderName} for application: ${applicationId}`);
      const newFolder = await createFolderMutation.mutateAsync({
        name: folderName,
        application_id: applicationId
      });

      // No need for additional refetch since we'll fetch fresh data on next call

      console.log(`Created folder: ${folderName} (${newFolder.id})`);
      toast.success(`Created folder: ${folderName}`);

      // Cache the new folder ID to prevent future duplicates
      setFolderCache(prev => ({ ...prev, [cacheKey]: newFolder.id }));

      return newFolder.id;
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error(`Failed to create folder: ${folderName}`);
      return undefined;
    }
  };

  // Handle camera capture
  const handleCameraCapture = (docId: string) => {
    setCurrentDocType(docId);
    setShowCamera(true);
  };

  // Retry function for server errors
  const retryUpload = async (uploadFn: () => Promise<any>, maxRetries = 2, delay = 1000): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await uploadFn();
      } catch (error: any) {
        const isServerError = error?.response?.status >= 500;
        const isLastAttempt = attempt === maxRetries + 1;

        if (isServerError && !isLastAttempt) {
          console.log(`Upload attempt ${attempt} failed with server error, retrying in ${delay}ms...`);
          const retryToastId = toast.loading(`Retrying upload... (attempt ${attempt}/${maxRetries + 1})`);
          // Dismiss the loading toast after the delay
          setTimeout(() => toast.dismiss(retryToastId), delay);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error; // Re-throw if not a server error or if last attempt
        }
      }
    }
  };

  // Handle file upload from input
  const handleFileUpload = async (files: File[], docType: string) => {
    if (!applicationId) {
      toast.error('Application ID is required for file upload');
      return;
    }

    // Get document definition to determine role
    const docDef = docDefs.find(d => d.id === docType);
    if (!docDef) {
      toast.error('Invalid document type');
      return;
    }

    // Get or create folder for this document role
    // Get or create folder for this document role
    const folderId = await getOrCreateFolder(docDef.role);

    for (const file of files) {
      const key = `${docType}-${Date.now()}-${file.name}`;

      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB`);
          continue;
        }

        // Set initial progress
        setUploadProgress(prev => ({ ...prev, [key]: 0 }));

        // Upload the file with folder ID (with retry for server errors)
        const uploadedFile = await retryUpload(() =>
          uploadFileMutation.mutateAsync({
            file,
            applicationId,
            folderId,
            documentType: getBackendDocumentType(docType),
            fieldName: docType,
            onProgress: (progress) => {
              setUploadProgress(prev => ({ ...prev, [key]: progress }));
            },
          })
        );

        console.log('Upload response:', uploadedFile);
        console.log('File uploaded with folder_id:', uploadedFile.folder_id);

        // Add to doc files and uploaded files after successful upload
        setDocFiles(prev => ({
          ...prev,
          [docType]: [...(prev[docType] || []), file]
        }));

        setUploadedFiles(prev => ({
          ...prev,
          [docType]: [...(prev[docType] || []), uploadedFile]
        }));

        toast.success(`${file.name} uploaded successfully to ${docDef.role} folder`);

        // Clear progress after successful upload
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[key];
            return newProgress;
          });
        }, 2000);

      } catch (error: any) {
        console.error('Upload failed:', error);

        // Check if it's a server error (5xx) vs client error (4xx)
        if (error?.response?.status >= 500) {
          toast.error(`Server temporarily unavailable. Please try again later.`);
        } else if (error?.response?.status === 413) {
          toast.error(`${file.name} is too large for upload.`);
        } else {
          toast.error(`Failed to upload ${file.name}: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
        }

        // Remove failed upload from progress
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[key];
          return newProgress;
        });
      }
    }
  };

  // Handle captured image
  const handleImageCaptured = async (capture: { blob: Blob; dataUrl: string; file: File }) => {
    if (!currentDocType) return;

    const key = `${currentDocType}-${Date.now()}-${capture.file.name}`;

    try {
      if (!applicationId) {
        toast.error('Application ID is required for file upload');
        return;
      }

      // Get document definition to determine role
      const docDef = docDefs.find(d => d.id === currentDocType);
      if (!docDef) {
        toast.error('Invalid document type');
        return;
      }

      // Get or create folder for this document role
      // Get or create folder for this document role
      const folderId = await getOrCreateFolder(docDef.role);

      // Set initial progress
      setUploadProgress(prev => ({ ...prev, [key]: 0 }));

      // Upload the file with folder ID (with retry for server errors)
      const uploadedFile = await retryUpload(() =>
        uploadFileMutation.mutateAsync({
          file: capture.file,
          applicationId,
          folderId,
          documentType: getBackendDocumentType(currentDocType),
          fieldName: currentDocType,
          onProgress: (progress) => {
            setUploadProgress(prev => ({ ...prev, [key]: progress }));
          },
        })
      );

      console.log('Camera upload response:', uploadedFile);
      console.log('Camera file uploaded with folder_id:', uploadedFile.folder_id);

      // Add to doc files and uploaded files after successful upload
      setDocFiles(prev => ({
        ...prev,
        [currentDocType]: [...(prev[currentDocType] || []), capture.file]
      }));

      setUploadedFiles(prev => ({
        ...prev,
        [currentDocType]: [...(prev[currentDocType] || []), uploadedFile]
      }));

      toast.success(`Photo captured and uploaded successfully to ${docDef.role} folder`);

      // Clear progress after successful upload
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[key];
          return newProgress;
        });
      }, 2000);

    } catch (error: any) {
      console.error('Upload failed:', error);

      // Check if it's a server error (5xx) vs client error (4xx)
      if (error?.response?.status >= 500) {
        toast.error(`Server temporarily unavailable. Please try again later.`);
      } else if (error?.response?.status === 413) {
        toast.error(`Captured photo is too large for upload.`);
      } else {
        toast.error(`Failed to upload captured photo: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
      }

      // Remove failed upload from progress
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[key];
        return newProgress;
      });
    }

    setShowCamera(false);
    setCurrentDocType(null);
  };

  const renderDocumentSection = (title: string, role: string) => (
    <div>
      <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">{title}</h4>
      <div className="space-y-3">
        {docDefs.filter(d => d.role === role).map((def) => (
          <div key={def.id} className="space-y-2">
            <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200">
              <input
                type="checkbox"
                checked={selectedDocs[def.id] || false}
                onChange={(e) => setSelectedDocs(prev => ({ ...prev, [def.id]: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{def.label}</span>
            </label>
            {selectedDocs[def.id] && (
              <div className="ml-6 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  {deviceInfo?.isMobile ? (
                    deviceInfo?.hasCamera ? (
                      // Mobile with camera: Camera-only mode
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => handleCameraCapture(def.id)}
                          className="w-full p-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                          <CameraIcon className="w-4 h-4" />
                          <span>Take Photo</span>
                        </button>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          Camera capture only on mobile devices
                        </p>
                      </div>
                    ) : (
                      // Mobile without camera: Show message
                      <div className="flex-1 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <DevicePhoneMobileIcon className="w-5 h-5" />
                          <span className="text-sm font-medium">Camera Required</span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Please enable camera access or use a desktop device to upload files.
                        </p>
                      </div>
                    )
                  ) : (
                    // Desktop: File upload with optional camera
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            handleFileUpload(files, def.id);
                          }
                        }}
                        className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {deviceInfo?.hasCamera && (
                        <button
                          type="button"
                          onClick={() => handleCameraCapture(def.id)}
                          className="flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 text-sm font-medium min-w-[120px]"
                        >
                          <CameraIcon className="w-4 h-4 mr-2" />
                          Camera
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Upload Progress */}
                {Object.entries(uploadProgress).filter(([key]) => key.startsWith(def.id)).map(([key, progress]) => (
                  <div key={key} className="text-xs">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span className="truncate max-w-[70%]" title={key}>Uploading...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded">
                      <div className="h-2 bg-blue-600 rounded transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ))}

                {/* Uploaded Files */}
                {uploadedFiles[def.id] && uploadedFiles[def.id].length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      Uploaded Files ({uploadedFiles[def.id].length}):
                    </p>
                    {uploadedFiles[def.id].map((file, idx) => (
                      <div key={file.id} className="text-xs flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <span className="truncate max-w-[70%]" title={file.original_filename}>
                          {file.original_filename}
                        </span>
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Document Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-lg">
              <PhotoIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">បន្ថែមឯកសារ</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">ជ្រើសរើសឯកសារថ្មី</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Borrower Documents */}
          {renderDocumentSection('ឯកសារអ្នកខ្ចី', 'borrower')}

          {/* Guarantor Documents */}
          {renderDocumentSection('ឯកសារអ្នកធានា', 'guarantor')}

          {/* Collateral Documents */}
          {renderDocumentSection('ឯកសារបញ្ចាំ', 'collateral')}
        </div>
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          isOpen={showCamera}
          onClose={() => {
            setShowCamera(false);
            setCurrentDocType(null);
          }}
          onCapture={handleImageCaptured}
          title={`Capture ${currentDocType ? docDefs.find(d => d.id === currentDocType)?.label : 'Document'}`}
        />
      )}
    </div>
  );
};