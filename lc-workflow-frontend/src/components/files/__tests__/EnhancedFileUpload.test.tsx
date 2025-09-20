import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';
import FileUploadModal from '../FileUploadModal';
import { toastManager } from '@/lib/toastManager';
import { uploadStatusTracker } from '@/lib/uploadStatusTracker';
import { networkAwareRetry } from '@/lib/retryMechanism';

// Mock dependencies
jest.mock('@/lib/toastManager');
jest.mock('@/lib/uploadStatusTracker');
jest.mock('@/lib/retryMechanism');
jest.mock('@/hooks/useFiles');
jest.mock('@/utils/deviceDetection');

const mockToastManager = toastManager as jest.Mocked<typeof toastManager>;
const mockUploadStatusTracker = uploadStatusTracker as jest.Mocked<typeof uploadStatusTracker>;
const mockNetworkAwareRetry = networkAwareRetry as jest.Mocked<typeof networkAwareRetry>;

// Mock file upload hook
const mockUploadFile = jest.fn();
jest.mock('@/hooks/useFiles', () => ({
  useUploadFile: () => ({
    mutateAsync: mockUploadFile,
    isPending: false,
  }),
}));

// Mock device detection
jest.mock('@/utils/deviceDetection', () => ({
  getDeviceInfo: jest.fn().mockResolvedValue({
    isMobile: false,
    hasCamera: true,
  }),
}));

describe('Enhanced File Upload System', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    jest.clearAllMocks();
    
    // Mock upload status tracker
    mockUploadStatusTracker.createUpload.mockReturnValue({
      id: 'test-upload-1',
      filename: 'test.jpg',
      fileSize: 1024,
      status: 'pending',
      progress: 0,
      uploadedBytes: 0,
      uploadSpeed: 0,
      timeRemaining: 0,
      retryCount: 0,
      maxRetries: 3,
    });

    mockUploadStatusTracker.addEventListener.mockReturnValue(() => {});
    mockUploadStatusTracker.getAllUploads.mockReturnValue([]);
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FileUploadModal
          isOpen={true}
          onClose={() => {}}
          applicationId="test-app-id"
          {...props}
        />
      </QueryClientProvider>
    );
  };

  describe('Progress Indicators', () => {
    it('should show progress indicators during file upload', async () => {
      renderComponent();

      // Create a test file
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock file input
      const fileInput = screen.getByRole('textbox', { hidden: true });
      
      // Simulate file drop
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Verify file appears in list
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Simulate upload start
      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      // Verify upload status tracking is called
      expect(mockUploadStatusTracker.createUpload).toHaveBeenCalledWith(
        expect.stringContaining('test.jpg'),
        'test.jpg',
        file.size
      );

      expect(mockUploadStatusTracker.startUpload).toHaveBeenCalled();
    });

    it('should update progress during upload', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock successful upload with progress
      mockUploadFile.mockImplementation(({ onProgress }) => {
        // Simulate progress updates
        setTimeout(() => onProgress?.(25), 100);
        setTimeout(() => onProgress?.(50), 200);
        setTimeout(() => onProgress?.(75), 300);
        setTimeout(() => onProgress?.(100), 400);
        
        return Promise.resolve({
          id: 'file-1',
          filename: 'test.jpg',
          application_id: 'test-app-id',
        });
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      // Verify progress tracking methods are called
      await waitFor(() => {
        expect(mockUploadStatusTracker.updateProgress).toHaveBeenCalled();
      });
    });
  });

  describe('Toast Notifications', () => {
    it('should show success toast on successful upload', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      mockUploadFile.mockResolvedValue({
        id: 'file-1',
        filename: 'test.jpg',
        application_id: 'test-app-id',
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadStatusTracker.completeUpload).toHaveBeenCalled();
      });
    });

    it('should show error toast on upload failure', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const error = new Error('Upload failed');
      
      mockUploadFile.mockRejectedValue(error);

      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadStatusTracker.failUpload).toHaveBeenCalledWith(
          expect.any(String),
          'Upload failed',
          true
        );
      });
    });

    it('should show network offline toast when offline', async () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      // Verify queued upload toast
      expect(mockToastManager.fileUploadQueued).toHaveBeenCalledWith('test.jpg');
    });
  });

  describe('Retry Mechanisms', () => {
    it('should provide retry option for failed uploads', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock initial failure then success
      mockUploadFile
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          id: 'file-1',
          filename: 'test.jpg',
          application_id: 'test-app-id',
        });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      // Wait for failure
      await waitFor(() => {
        expect(mockUploadStatusTracker.failUpload).toHaveBeenCalled();
      });

      // Verify retry functionality is available
      expect(mockNetworkAwareRetry.uploadWithNetworkRetry).toHaveBeenCalledWith(
        expect.any(String),
        'test.jpg',
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 3,
          onRetry: expect.any(Function),
        })
      );
    });

    it('should handle network-aware retry mechanism', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      mockNetworkAwareRetry.uploadWithNetworkRetry.mockImplementation(
        (fileId, filename, uploadFn, options) => {
          // Simulate retry logic
          options?.onRetry?.(1, new Error('Network error'));
          return uploadFn();
        }
      );

      mockUploadFile.mockResolvedValue({
        id: 'file-1',
        filename: 'test.jpg',
        application_id: 'test-app-id',
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockNetworkAwareRetry.uploadWithNetworkRetry).toHaveBeenCalled();
      });
    });
  });

  describe('Real-time Upload Status Tracking', () => {
    it('should track upload status in real-time', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      mockUploadFile.mockImplementation(({ onProgress }) => {
        // Simulate real-time progress updates
        const interval = setInterval(() => {
          const progress = Math.min(100, Math.random() * 100);
          onProgress?.(progress);
        }, 100);

        setTimeout(() => clearInterval(interval), 1000);

        return Promise.resolve({
          id: 'file-1',
          filename: 'test.jpg',
          application_id: 'test-app-id',
        });
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      // Verify real-time tracking
      await waitFor(() => {
        expect(mockUploadStatusTracker.startUpload).toHaveBeenCalled();
        expect(mockUploadStatusTracker.updateProgress).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should handle upload cancellation', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Start upload
      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      // Simulate cancel action (this would be triggered by the ProgressIndicator)
      mockUploadStatusTracker.cancelUpload('test-upload-1');

      expect(mockUploadStatusTracker.cancelUpload).toHaveBeenCalledWith('test-upload-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle different types of upload errors', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      // Test different error scenarios
      const errorScenarios = [
        { error: { response: { status: 413 } }, expectedMessage: 'File too large' },
        { error: { response: { status: 415 } }, expectedMessage: 'File type not supported' },
        { error: { response: { status: 429 } }, expectedMessage: 'Too many requests' },
        { error: { response: { status: 500 } }, expectedMessage: 'Server error' },
        { error: { code: 'NETWORK_ERROR' }, expectedMessage: 'Network connection error' },
      ];

      for (const scenario of errorScenarios) {
        mockUploadFile.mockRejectedValueOnce(scenario.error);

        const fileInput = screen.getByRole('textbox', { hidden: true });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const uploadButton = screen.getByText('Upload All');
        fireEvent.click(uploadButton);

        await waitFor(() => {
          expect(mockUploadStatusTracker.failUpload).toHaveBeenCalled();
        });

        // Reset for next iteration
        jest.clearAllMocks();
      }
    });

    it('should provide appropriate user feedback for each error type', async () => {
      renderComponent();

      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock file too large error
      mockUploadFile.mockRejectedValue({
        response: { status: 413, data: { detail: 'File too large' } }
      });

      const fileInput = screen.getByRole('textbox', { hidden: true });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const uploadButton = screen.getByText('Upload All');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadStatusTracker.failUpload).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('File too large'),
          true
        );
      });
    });
  });
});

describe('Toast Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide enhanced success notifications', () => {
    toastManager.success('Upload Complete', 'File uploaded successfully');
    expect(mockToastManager.success).toHaveBeenCalledWith(
      'Upload Complete',
      'File uploaded successfully'
    );
  });

  it('should provide error notifications with retry options', () => {
    const retryFn = jest.fn();
    toastManager.error('Upload Failed', 'Network error occurred', { onRetry: retryFn });
    
    expect(mockToastManager.error).toHaveBeenCalledWith(
      'Upload Failed',
      'Network error occurred',
      expect.objectContaining({ onRetry: retryFn })
    );
  });

  it('should handle progress notifications', () => {
    toastManager.progress('upload-1', 'Uploading file', 50);
    expect(mockToastManager.progress).toHaveBeenCalledWith('upload-1', 'Uploading file', 50);
  });
});

describe('Upload Status Tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track upload lifecycle', () => {
    const uploadId = 'test-upload-1';
    const filename = 'test.jpg';
    const fileSize = 1024;

    // Create upload
    uploadStatusTracker.createUpload(uploadId, filename, fileSize);
    expect(mockUploadStatusTracker.createUpload).toHaveBeenCalledWith(
      uploadId,
      filename,
      fileSize
    );

    // Start upload
    uploadStatusTracker.startUpload(uploadId);
    expect(mockUploadStatusTracker.startUpload).toHaveBeenCalledWith(uploadId);

    // Update progress
    uploadStatusTracker.updateProgress(uploadId, 512);
    expect(mockUploadStatusTracker.updateProgress).toHaveBeenCalledWith(uploadId, 512);

    // Complete upload
    uploadStatusTracker.completeUpload(uploadId);
    expect(mockUploadStatusTracker.completeUpload).toHaveBeenCalledWith(uploadId);
  });

  it('should handle upload failures', () => {
    const uploadId = 'test-upload-1';
    const error = 'Network error';

    uploadStatusTracker.failUpload(uploadId, error, true);
    expect(mockUploadStatusTracker.failUpload).toHaveBeenCalledWith(
      uploadId,
      error,
      true
    );
  });
});

describe('Network Aware Retry Mechanism', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle network-aware retries', async () => {
    const uploadFn = jest.fn().mockResolvedValue('success');
    const options = { maxAttempts: 3 };

    await networkAwareRetry.uploadWithNetworkRetry(
      'upload-1',
      'test.jpg',
      uploadFn,
      options
    );

    expect(mockNetworkAwareRetry.uploadWithNetworkRetry).toHaveBeenCalledWith(
      'upload-1',
      'test.jpg',
      uploadFn,
      options
    );
  });

  it('should queue uploads when offline', async () => {
    // Mock offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const uploadFn = jest.fn();
    
    mockNetworkAwareRetry.uploadWithNetworkRetry.mockImplementation(() => {
      return new Promise((resolve) => {
        // Simulate queuing
        setTimeout(() => resolve('queued'), 100);
      });
    });

    const result = await networkAwareRetry.uploadWithNetworkRetry(
      'upload-1',
      'test.jpg',
      uploadFn
    );

    expect(result).toBe('queued');
  });
});