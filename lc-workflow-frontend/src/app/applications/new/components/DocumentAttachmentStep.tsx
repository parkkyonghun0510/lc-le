'use client';

import React, { useState, useEffect } from 'react';
import {
  PhotoIcon,
  CameraIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { DocumentType, DocumentTypeInfo } from '../types';
import { File as ApiFile } from '@/types/models';
import { useUploadFile } from '@/hooks/useFiles';
import { CameraCapture } from '@/components/CameraCapture';
import { isMobileDevice, getDeviceInfo, DeviceInfo } from '@/utils/deviceDetection';

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
    // { id: 'borrower_nid_back', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកខ្ចី (ក្រោយ)', role: 'borrower' },
    { id: 'guarantor_photo', label: 'រូបថតអ្នកធានា', role: 'guarantor' },
    { id: 'guarantor_nid_front', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកធានា (មុខ)', role: 'guarantor' },
    // { id: 'guarantor_nid_back', label: 'អត្តសញ្ញាណប័ណ្ណ អ្នកធានា (ក្រោយ)', role: 'guarantor' },
    { id: 'driver_license', label: 'បណ្ណបើកបរ', role: 'borrower' },
    { id: 'passport', label: 'លិខិតឆ្លងដែន', role: 'borrower' },
    { id: 'business_license', label: 'អាជ្ញាបណ្ណអាជីវកម្ម', role: 'borrower' },
    { id: 'land_title', label: 'បណ្ណកម្មសិទ្ធិដី', role: 'collateral' },
    { id: 'house_photo', label: 'រូបផ្ទះ', role: 'collateral' },
    { id: 'collateral_other', label: 'បញ្ចាំផ្សេងៗ', role: 'collateral' },
  ];
  
  // Mobile device detection
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [currentDocType, setCurrentDocType] = useState<string | null>(null);
  
  // Existing state
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
  const [docFiles, setDocFiles] = useState<Record<string, File[]>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // Upload hook
  const uploadFileMutation = useUploadFile();
  
  // Detect device on mount
  useEffect(() => {
    const detectDevice = async () => {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
    };
    detectDevice();
  }, []);
  
  // Handle camera capture
  const handleCameraCapture = (docId: string) => {
    setCurrentDocType(docId);
    setShowCamera(true);
  };
  
  // Handle captured image
  const handleImageCaptured = async (capture: { blob: Blob; dataUrl: string; file: File }) => {
    if (!currentDocType) return;
    
    // Add to doc files
    setDocFiles(prev => ({
      ...prev,
      [currentDocType]: [...(prev[currentDocType] || []), capture.file]
    }));
    
    // Upload the file
    const key = `${currentDocType}-${docFiles[currentDocType]?.length || 0}-${capture.file.name}`;
    try {
      await uploadFileMutation.mutateAsync({
        file: capture.file,
        applicationId,
        documentType: 'photos',
        onProgress: (progress) => {
          setUploadProgress(prev => ({ ...prev, [key]: progress }));
        },
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }
    
    setShowCamera(false);
    setCurrentDocType(null);
  };
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
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">ឯកសារអ្នកខ្ចី</h4>
            <div className="space-y-3">
              {docDefs.filter(d => d.role === 'borrower').map((def) => (
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
                                setDocFiles(prev => ({ ...prev, [def.id]: files as File[] }));
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
                      {Array.isArray(docFiles[def.id]) && docFiles[def.id].length > 0 && (
                        <div className="space-y-2">
                          {docFiles[def.id].map((file, idx) => {
                            const key = `${def.id}-${idx}-${file.name}`;
                            const progress = uploadProgress[key] ?? 0;
                            return (
                              <div key={key} className="text-xs">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                  <span className="truncate max-w-[70%]" title={file.name}>{file.name}</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded">
                                  <div className="h-2 bg-blue-600 rounded transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Guarantor Documents */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">ឯកសារអ្នកធានា</h4>
            <div className="space-y-3">
              {docDefs.filter(d => d.role === 'guarantor').map((def) => (
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
                    <div className="ml-6">
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
                                setDocFiles(prev => ({ ...prev, [def.id]: files }));
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Collateral Documents */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">ឯកសារបញ្ចាំ</h4>
            <div className="space-y-3">
              {docDefs.filter(d => d.role === 'collateral').map((def) => (
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
                    <div className="ml-6">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {deviceInfo?.isMobile && deviceInfo?.hasCamera ? (
                          // Mobile: Camera-only mode
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
                          // Desktop: File upload with optional camera
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setDocFiles(prev => ({ ...prev, [def.id]: files }));
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
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