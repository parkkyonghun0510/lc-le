/**
 * End-to-End Tests for File Upload Workflows
 * 
 * These tests validate complete user workflows from the frontend perspective,
 * ensuring all components work together correctly.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/applications/test-app-id',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API calls
const mockApiCalls = {
  uploadFile: jest.fn(),
  getFiles: jest.fn(),
  getFolders: jest.fn(),
  deleteFile: jest.fn(),
  downloadFile: jest.fn(),
};

jest.mock('@/lib/api', () => ({
  uploadFile: (...args: any[]) => mockApiCalls.uploadFile(...args),
  getFiles: (...args: any[]) => mockApiCalls.getFiles(...args),
  getFolders: (...args: any[]) => mockApiCalls.getFolders(...args),
  deleteFile: (...args: any[]) => mockApiCalls.deleteFile(...args),
  downloadFile: (...args: any[]) => mockApiCalls.downloadFile(...args),
}));

// Mock device detection
jest.mock('@/utils/deviceDetection', () => ({
  getDeviceInfo: jest.fn().mockResolvedValue({
    isMobile: false,
    hasCamera: true,
    supportsFileAPI: true,
  }),
}));

// Import components after mocks
import FileUploadModal from '@/components/files/FileUploadModal';
import FileManager from '@/components/files/FileManager';
import { ToasterClient } from '@/components/ToasterClient';

describe('Complete File Upload Workflow', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();

    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockApiCalls.uploadFile.mockResolvedValue({
      id: 'test-file-id',
      filename: 'test.jpg',
      folder_id: 'test-folder-id',
      application_id: 'test-app-id',
      file_size: 1024,
      mime_type: 'image/jpeg',
    });

    mockApiCalls.getFiles.mockResolvedValue([]);
    mockApiCalls.getFolders.mockResolvedValue([
      {
        id: 'test-folder-id',
        name: 'Borrower Documents',
        application_id: 'test-app-id',
      },
    ]);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToasterClient />
        {component}
      </QueryClientProvider>
    );
  };

  describe('File Upload Modal Workflow', () => {
    it('should complete full file upload workflow with success feedback', async () => {
      const onClose = jest.fn();
      
      renderWithProviders(
        <FileUploadModal
          isOpen={true}
          onClose={onClose}
          applicationId="test-app-id"
        />
      );

      // Step 1: Modal should be visible
      expect(screen.getByText('Upload Files')).toBeInTheDocument();
      expect(screen.getByText('Document Field Name (Optional)')).toBeInTheDocument();

      // Step 2: Add field name
      const fieldNameInput = screen.getByLabelText('Document Field Name (Optional)');
      await user.type(fieldNameInput, 'borrower_photo');
      expect(fieldNameInput).toHaveValue('borrower_photo');

      // Step 3: Select file
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/drag & drop files here/i);
      
      await user.upload(fileInput, file);

      // Step 4: File should appear in the list
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Step 5: Upload button should be available
      const uploadButton = screen.getByText('Upload All');
      expect(uploadButton).toBeInTheDocument();

      // Step 6: Click upload
      await user.click(uploadButton);

      // Step 7: Verify API call
      await waitFor(() => {
        expect(mockApiCalls.uploadFile).toHaveBeenCalledWith(
          expect.objectContaining({
            file: expect.any(File),
            applicationId: 'test-app-id',
            fieldName: 'borrower_photo',
          })
        );
      });

      // Step 8: Success feedback should appear
      await waitFor(() => {
        expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
      });

      // Step 9: Modal should close after success
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should handle upload errors with retry functionality', async () => {
      // Mock upload failure
      mockApiCalls.uploadFile.mockRejectedValueOnce(new Error('Upload failed'));
      
      const onClose = jest.fn();
      
      renderWithProviders(
        <FileUploadModal
          isOpen={true}
          onClose={onClose}
          applicationId="test-app-id"
        />
      );

      // Add file
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/drag & drop files here/i);
      await user.upload(fileInput, file);

      // Upload
      const uploadButton = screen.getByText('Upload All');
      await user.click(uploadButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();

      // Mock successful retry
      mockApiCalls.uploadFile.mockResolvedValueOnce({
        id: 'test-file-id',
        filename: 'test.jpg',
        folder_id: 'test-folder-id',
        application_id: 'test-app-id',
      });

      // Click retry
      await user.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
      });
    });

    it('should handle multiple file uploads with progress tracking', async () => {
      const onClose = jest.fn();
      
      renderWithProviders(
        <FileUploadModal
          isOpen={true}
          onClose={onClose}
          applicationId="test-app-id"
        />
      );

      // Add multiple files
      const files = [
        new File(['content 1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['content 2'], 'file2.pdf', { type: 'application/pdf' }),
        new File(['content 3'], 'file3.jpg', { type: 'image/jpeg' }),
      ];

      const fileInput = screen.getByLabelText(/drag & drop files here/i);
      await user.upload(fileInput, files);

      // All files should appear
      await waitFor(() => {
        expect(screen.getByText('file1.jpg')).toBeInTheDocument();
        expect(screen.getByText('file2.pdf')).toBeInTheDocument();
        expect(screen.getByText('file3.jpg')).toBeInTheDocument();
      });

      // Upload all
      const uploadButton = screen.getByText('Upload All');
      await user.click(uploadButton);

      // Should show progress for each file
      await waitFor(() => {
        expect(mockApiCalls.uploadFile).toHaveBeenCalledTimes(3);
      });

      // Should show success for all files
      await waitFor(() => {
        expect(screen.getByText(/all files uploaded successfully/i)).toBeInTheDocument();
      });
    });

    it('should validate file types and show appropriate errors', async () => {
      const onClose = jest.fn();
      
      renderWithProviders(
        <FileUploadModal
          isOpen={true}
          onClose={onClose}
          applicationId="test-app-id"
        />
      );

      // Try to upload invalid file type
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-executable' });
      const fileInput = screen.getByLabelText(/drag & drop files here/i);
      
      await user.upload(fileInput, invalidFile);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument();
      });

      // Upload button should be disabled or not present
      expect(screen.queryByText('Upload All')).not.toBeInTheDocument();
    });
  });

  describe('File Manager Integration', () => {
    it('should display files organized by folders', async () => {
      // Mock files and folders
      mockApiCalls.getFiles.mockResolvedValue([
        {
          id: 'file1',
          filename: 'borrower_photo.jpg',
          folder_id: 'folder1',
          application_id: 'test-app-id',
          file_size: 1024,
          mime_type: 'image/jpeg',
        },
        {
          id: 'file2',
          filename: 'id_card.jpg',
          folder_id: 'folder1',
          application_id: 'test-app-id',
          file_size: 2048,
          mime_type: 'image/jpeg',
        },
      ]);

      mockApiCalls.getFolders.mockResolvedValue([
        {
          id: 'folder1',
          name: 'Borrower Documents',
          application_id: 'test-app-id',
        },
      ]);

      renderWithProviders(
        <FileManager applicationId="test-app-id" />
      );

      // Should load and display folders
      await waitFor(() => {
        expect(screen.getByText('Borrower Documents')).toBeInTheDocument();
      });

      // Should display files within folders
      await waitFor(() => {
        expect(screen.getByText('borrower_photo.jpg')).toBeInTheDocument();
        expect(screen.getByText('id_card.jpg')).toBeInTheDocument();
      });
    });

    it('should handle file deletion with confirmation', async () => {
      mockApiCalls.getFiles.mockResolvedValue([
        {
          id: 'file1',
          filename: 'test.jpg',
          folder_id: 'folder1',
          application_id: 'test-app-id',
          file_size: 1024,
          mime_type: 'image/jpeg',
        },
      ]);

      mockApiCalls.getFolders.mockResolvedValue([
        {
          id: 'folder1',
          name: 'Test Folder',
          application_id: 'test-app-id',
        },
      ]);

      mockApiCalls.deleteFile.mockResolvedValue({ success: true });

      renderWithProviders(
        <FileManager applicationId="test-app-id" />
      );

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButton = screen.getByLabelText(/delete file/i);
      await user.click(deleteButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await user.click(confirmButton);

      // Should call delete API
      await waitFor(() => {
        expect(mockApiCalls.deleteFile).toHaveBeenCalledWith('file1');
      });

      // File should be removed from display
      await waitFor(() => {
        expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
      });
    });

    it('should handle file download', async () => {
      mockApiCalls.getFiles.mockResolvedValue([
        {
          id: 'file1',
          filename: 'test.pdf',
          folder_id: 'folder1',
          application_id: 'test-app-id',
          file_size: 1024,
          mime_type: 'application/pdf',
        },
      ]);

      mockApiCalls.getFolders.mockResolvedValue([
        {
          id: 'folder1',
          name: 'Test Folder',
          application_id: 'test-app-id',
        },
      ]);

      // Mock successful download
      mockApiCalls.downloadFile.mockResolvedValue(new Blob(['pdf content']));

      renderWithProviders(
        <FileManager applicationId="test-app-id" />
      );

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      // Find and click download button
      const downloadButton = screen.getByLabelText(/download file/i);
      await user.click(downloadButton);

      // Should call download API
      await waitFor(() => {
        expect(mockApiCalls.downloadFile).toHaveBeenCalledWith('file1');
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockApiCalls.getFiles.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <FileManager applicationId="test-app-id" />
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to load files/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();

      // Mock successful retry
      mockApiCalls.getFiles.mockResolvedValue([]);

      // Click retry
      await user.click(retryButton);

      // Should retry the request
      await waitFor(() => {
        expect(mockApiCalls.getFiles).toHaveBeenCalledTimes(2);
      });
    });

    it('should show offline status and queue uploads', async () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const onClose = jest.fn();
      
      renderWithProviders(
        <FileUploadModal
          isOpen={true}
          onClose={onClose}
          applicationId="test-app-id"
        />
      );

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });

      // Add file
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/drag & drop files here/i);
      await user.upload(fileInput, file);

      // Try to upload
      const uploadButton = screen.getByText('Upload All');
      await user.click(uploadButton);

      // Should show queued message
      await waitFor(() => {
        expect(screen.getByText(/queued for upload/i)).toBeInTheDocument();
      });

      // Simulate going back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Dispatch online event
      window.dispatchEvent(new Event('online'));

      // Should attempt upload when back online
      await waitFor(() => {
        expect(mockApiCalls.uploadFile).toHaveBeenCalled();
      });
    });
  });

  describe('Mobile Compatibility', () => {
    beforeEach(() => {
      // Mock mobile device
      jest.mocked(require('@/utils/deviceDetection').getDeviceInfo).mockResolvedValue({
        isMobile: true,
        hasCamera: true,
        supportsFileAPI: true,
      });
    });

    it('should show camera capture option on mobile', async () => {
      const onClose = jest.fn();
      
      renderWithProviders(
        <FileUploadModal
          isOpen={true}
          onClose={onClose}
          applicationId="test-app-id"
        />
      );

      // Should show camera button
      await waitFor(() => {
        expect(screen.getByText(/take photo/i)).toBeInTheDocument();
      });
    });

    it('should handle camera capture workflow', async () => {
      // Mock camera capture
      const mockCameraCapture = jest.fn().mockResolvedValue(
        new File(['camera content'], 'camera.jpg', { type: 'image/jpeg' })
      );

      // Mock the camera component
      jest.mock('@/components/CameraCapture', () => {
        return function MockCameraCapture({ onCapture }: { onCapture: (file: File) => void }) {
          return (
            <button onClick={() => onCapture(mockCameraCapture())}>
              Capture Photo
            </button>
          );
        };
      });

      const onClose = jest.fn();
      
      renderWithProviders(
        <FileUploadModal
          isOpen={true}
          onClose={onClose}
          applicationId="test-app-id"
        />
      );

      // Click camera button
      const cameraButton = screen.getByText(/take photo/i);
      await user.click(cameraButton);

      // Should show camera interface
      await waitFor(() => {
        expect(screen.getByText(/capture photo/i)).toBeInTheDocument();
      });

      // Capture photo
      const captureButton = screen.getByText(/capture photo/i);
      await user.click(captureButton);

      // Should add captured file to upload list
      await waitFor(() => {
        expect(screen.getByText('camera.jpg')).toBeInTheDocument();
      });
    });
  });
});