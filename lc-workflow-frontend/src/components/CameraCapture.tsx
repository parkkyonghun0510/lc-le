import React, { useState, useEffect } from 'react';
import { useCamera, CameraCapture as CameraCaptureType } from '../hooks/useCamera';
import { isMobileDevice } from '../utils/deviceDetection';
import {
  CameraIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (capture: CameraCaptureType) => void;
  title?: string;
  description?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Take Photo',
  description = 'Position your document or item in the frame and tap to capture'
}) => {
  const {
    cameraState,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    requestPermission
  } = useCamera();

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedData, setCapturedData] = useState<CameraCaptureType | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const isMobile = isMobileDevice();

  // Initialize camera when component opens
  useEffect(() => {
    if (isOpen && !cameraState.isActive && !cameraState.hasPermission) {
      handleInitializeCamera();
    }
  }, [isOpen]);

  // Cleanup when component closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCapturedData(null); // Clear captured data on close
    }
  }, [isOpen, stopCamera]);

  const handleInitializeCamera = async () => {
    const hasPermission = await requestPermission();
    if (hasPermission) {
      await startCamera('environment'); // Default to back camera for document capture
    }
  };

  const handleCapture = async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    try {
      const capture = await capturePhoto();
      if (capture) {
        setCapturedImage(capture.dataUrl);
        setCapturedData(capture); // Store the complete capture data
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirmCapture = async () => {
    if (!capturedImage || !capturedData) return;
    
    // Use the already captured data instead of capturing again
    onCapture(capturedData);
    onClose();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedData(null); // Clear the captured data as well
  };

  const handleSwitchCamera = async () => {
    if (!cameraState.isActive) return;
    await switchCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="relative w-full h-full max-w-md mx-auto bg-black">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-gray-300">{description}</p>
            </div>
            {isMobile && cameraState.isActive && (
              <button
                onClick={handleSwitchCamera}
                className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
              >
                <ArrowPathIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Camera View */}
        <div className="relative w-full h-full flex items-center justify-center">
          {cameraState.error && (
            <div className="text-center text-white p-6">
              <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
              <p className="text-gray-300 mb-4">{cameraState.error}</p>
              <button
                onClick={handleInitializeCamera}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {cameraState.isLoading && (
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Initializing camera...</p>
            </div>
          )}

          {!cameraState.error && !cameraState.isLoading && (
            <>
              {/* Video Preview */}
              {!capturedImage && (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
              )}

              {/* Captured Image Preview */}
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Camera Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Frame Guide */}
                <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          {!capturedImage ? (
            /* Capture Controls */
            <div className="flex items-center justify-center">
              <button
                onClick={handleCapture}
                disabled={!cameraState.isActive || isCapturing}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                {isCapturing ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                ) : (
                  <CameraIcon className="w-8 h-8 text-gray-800" />
                )}
              </button>
            </div>
          ) : (
            /* Confirm/Retake Controls */
            <div className="flex items-center justify-between">
              <button
                onClick={handleRetake}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retake
              </button>
              <button
                onClick={handleConfirmCapture}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                Use Photo
              </button>
            </div>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>
    </div>
  );
};