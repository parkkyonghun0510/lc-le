import { useState, useRef, useCallback, useEffect } from 'react';
import { getCameraConstraints, isCameraAccessSupported } from '../utils/deviceDetection';

export interface CameraState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  stream: MediaStream | null;
}

export interface CameraCapture {
  blob: Blob;
  dataUrl: string;
  file: File;
}

export interface UseCameraReturn {
  cameraState: CameraState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startCamera: (facingMode?: 'user' | 'environment') => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<CameraCapture | null>;
  switchCamera: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

/**
 * Custom hook for camera functionality with permission handling
 */
export const useCamera = (): UseCameraReturn => {
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isLoading: false,
    error: null,
    hasPermission: false,
    stream: null
  });

  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Request camera permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isCameraAccessSupported()) {
      setCameraState(prev => ({
        ...prev,
        error: 'Camera access is not supported on this device'
      }));
      return false;
    }

    try {
      setCameraState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Request permission by trying to access the camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop the stream immediately as we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      
      setCameraState(prev => ({
        ...prev,
        hasPermission: true,
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      setCameraState(prev => ({
        ...prev,
        error: errorMessage,
        hasPermission: false,
        isLoading: false
      }));
      return false;
    }
  }, []);

  /**
   * Start camera with specified facing mode
   */
  const startCamera = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
    if (!isCameraAccessSupported()) {
      setCameraState(prev => ({
        ...prev,
        error: 'Camera access is not supported on this device'
      }));
      return;
    }

    try {
      setCameraState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Stop existing stream if any
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach(track => track.stop());
      }

      const constraints = getCameraConstraints(facingMode);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCurrentFacingMode(facingMode);
      setCameraState(prev => ({
        ...prev,
        isActive: true,
        isLoading: false,
        hasPermission: true,
        stream
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start camera';
      setCameraState(prev => ({
        ...prev,
        error: errorMessage,
        isActive: false,
        isLoading: false
      }));
    }
  }, [cameraState.stream]);

  /**
   * Stop camera and cleanup
   */
  const stopCamera = useCallback(() => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach(track => track.stop());
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState(prev => ({
      ...prev,
      isActive: false,
      stream: null
    }));
  }, [cameraState.stream]);

  /**
   * Capture photo from video stream
   */
  const capturePhoto = useCallback(async (): Promise<CameraCapture | null> => {
    if (!videoRef.current || !canvasRef.current || !cameraState.isActive) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and data URL
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        resolve({ blob, dataUrl, file });
      }, 'image/jpeg', 0.8);
    });
  }, [cameraState.isActive]);

  /**
   * Switch between front and back camera
   */
  const switchCamera = useCallback(async () => {
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    await startCamera(newFacingMode);
  }, [currentFacingMode, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraState.stream]);

  return {
    cameraState,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    requestPermission
  };
};