import { toastManager } from './toastManager';

export interface UploadStatus {
  id: string;
  filename: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused' | 'cancelled' | 'queued';
  progress: number;
  uploadedBytes: number;
  uploadSpeed: number; // bytes per second
  timeRemaining: number; // seconds
  startTime?: Date;
  endTime?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface UploadBatch {
  id: string;
  name: string;
  uploads: UploadStatus[];
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
}

export type UploadEventType = 
  | 'upload_started'
  | 'upload_progress'
  | 'upload_completed'
  | 'upload_failed'
  | 'upload_paused'
  | 'upload_resumed'
  | 'upload_cancelled'
  | 'upload_queued'
  | 'batch_started'
  | 'batch_completed'
  | 'batch_failed';

export interface UploadEvent {
  type: UploadEventType;
  uploadId: string;
  batchId?: string;
  data?: any;
  timestamp: Date;
}

export type UploadEventListener = (event: UploadEvent) => void;

class UploadStatusTracker {
  private uploads = new Map<string, UploadStatus>();
  private batches = new Map<string, UploadBatch>();
  private listeners = new Set<UploadEventListener>();
  private progressIntervals = new Map<string, NodeJS.Timeout>();

  // Event management
  addEventListener(listener: UploadEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: UploadEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in upload event listener:', error);
      }
    });
  }

  // Upload management
  createUpload(
    id: string,
    filename: string,
    fileSize: number,
    maxRetries: number = 3
  ): UploadStatus {
    const upload: UploadStatus = {
      id,
      filename,
      fileSize,
      status: 'pending',
      progress: 0,
      uploadedBytes: 0,
      uploadSpeed: 0,
      timeRemaining: 0,
      retryCount: 0,
      maxRetries,
    };

    this.uploads.set(id, upload);
    return upload;
  }

  startUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload) return;

    upload.status = 'uploading';
    upload.startTime = new Date();
    upload.progress = 0;
    upload.uploadedBytes = 0;

    this.emit({
      type: 'upload_started',
      uploadId: id,
      timestamp: new Date(),
    });

    // Start progress tracking
    this.startProgressTracking(id);

    // Show progress toast
    toastManager.progress(id, `Uploading ${upload.filename}`, 0);
  }

  updateProgress(id: string, uploadedBytes: number): void {
    const upload = this.uploads.get(id);
    if (!upload || upload.status !== 'uploading') return;

    const previousBytes = upload.uploadedBytes;
    upload.uploadedBytes = uploadedBytes;
    upload.progress = (uploadedBytes / upload.fileSize) * 100;

    // Calculate upload speed and time remaining
    if (upload.startTime) {
      const elapsedTime = (Date.now() - upload.startTime.getTime()) / 1000;
      if (elapsedTime > 0) {
        upload.uploadSpeed = uploadedBytes / elapsedTime;
        
        const remainingBytes = upload.fileSize - uploadedBytes;
        upload.timeRemaining = upload.uploadSpeed > 0 ? remainingBytes / upload.uploadSpeed : 0;
      }
    }

    this.emit({
      type: 'upload_progress',
      uploadId: id,
      data: {
        progress: upload.progress,
        uploadedBytes,
        uploadSpeed: upload.uploadSpeed,
        timeRemaining: upload.timeRemaining,
      },
      timestamp: new Date(),
    });

    // Update progress toast
    toastManager.progress(id, `Uploading ${upload.filename}`, upload.progress);
  }

  completeUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload) return;

    upload.status = 'completed';
    upload.progress = 100;
    upload.uploadedBytes = upload.fileSize;
    upload.endTime = new Date();

    this.stopProgressTracking(id);

    this.emit({
      type: 'upload_completed',
      uploadId: id,
      timestamp: new Date(),
    });

    // Complete progress toast
    toastManager.completeProgress(id, upload.filename);
  }

  failUpload(id: string, error: string, canRetry: boolean = true): void {
    const upload = this.uploads.get(id);
    if (!upload) return;

    upload.status = 'error';
    upload.error = error;
    upload.endTime = new Date();

    this.stopProgressTracking(id);

    this.emit({
      type: 'upload_failed',
      uploadId: id,
      data: { error, canRetry },
      timestamp: new Date(),
    });

    // Show error toast with retry option
    if (canRetry && upload.retryCount < upload.maxRetries) {
      toastManager.failProgress(
        id, 
        upload.filename, 
        error,
        () => this.retryUpload(id)
      );
    } else {
      toastManager.failProgress(id, upload.filename, error);
    }
  }

  pauseUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload || upload.status !== 'uploading') return;

    upload.status = 'paused';
    this.stopProgressTracking(id);

    this.emit({
      type: 'upload_paused',
      uploadId: id,
      timestamp: new Date(),
    });

    toastManager.info(`Upload Paused`, `${upload.filename} upload has been paused.`);
  }

  resumeUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload || upload.status !== 'paused') return;

    upload.status = 'uploading';
    this.startProgressTracking(id);

    this.emit({
      type: 'upload_resumed',
      uploadId: id,
      timestamp: new Date(),
    });

    toastManager.info(`Upload Resumed`, `Resuming upload of ${upload.filename}...`);
  }

  cancelUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload) return;

    upload.status = 'cancelled';
    upload.endTime = new Date();
    this.stopProgressTracking(id);

    this.emit({
      type: 'upload_cancelled',
      uploadId: id,
      timestamp: new Date(),
    });

    toastManager.cancelProgress(id);
    toastManager.info(`Upload Cancelled`, `${upload.filename} upload has been cancelled.`);
  }

  queueUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload) return;

    upload.status = 'queued';

    this.emit({
      type: 'upload_queued',
      uploadId: id,
      timestamp: new Date(),
    });

    toastManager.fileUploadQueued(upload.filename);
  }

  retryUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (!upload) return;

    upload.retryCount++;
    upload.status = 'pending';
    upload.error = undefined;
    upload.progress = 0;
    upload.uploadedBytes = 0;

    toastManager.fileUploadRetrying(upload.filename, upload.retryCount);
  }

  // Batch management
  createBatch(id: string, name: string, uploadIds: string[]): UploadBatch {
    const uploads = uploadIds
      .map(uploadId => this.uploads.get(uploadId))
      .filter(Boolean) as UploadStatus[];

    const batch: UploadBatch = {
      id,
      name,
      uploads,
      startTime: new Date(),
      status: 'pending',
    };

    this.batches.set(id, batch);
    return batch;
  }

  startBatch(id: string): void {
    const batch = this.batches.get(id);
    if (!batch) return;

    batch.status = 'uploading';
    batch.startTime = new Date();

    this.emit({
      type: 'batch_started',
      uploadId: '',
      batchId: id,
      timestamp: new Date(),
    });

    toastManager.batchOperationStart('Upload', batch.uploads.length);
  }

  completeBatch(id: string): void {
    const batch = this.batches.get(id);
    if (!batch) return;

    batch.status = 'completed';
    batch.endTime = new Date();

    const successCount = batch.uploads.filter(u => u.status === 'completed').length;
    const failCount = batch.uploads.filter(u => u.status === 'error').length;

    this.emit({
      type: 'batch_completed',
      uploadId: '',
      batchId: id,
      data: { successCount, failCount },
      timestamp: new Date(),
    });

    toastManager.batchOperationComplete('Upload', successCount, failCount);
  }

  // Progress tracking
  private startProgressTracking(id: string): void {
    const interval = setInterval(() => {
      const upload = this.uploads.get(id);
      if (!upload || upload.status !== 'uploading') {
        this.stopProgressTracking(id);
        return;
      }

      // Emit periodic progress events for UI updates
      this.emit({
        type: 'upload_progress',
        uploadId: id,
        data: {
          progress: upload.progress,
          uploadedBytes: upload.uploadedBytes,
          uploadSpeed: upload.uploadSpeed,
          timeRemaining: upload.timeRemaining,
        },
        timestamp: new Date(),
      });
    }, 1000); // Update every second

    this.progressIntervals.set(id, interval);
  }

  private stopProgressTracking(id: string): void {
    const interval = this.progressIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.progressIntervals.delete(id);
    }
  }

  // Getters
  getUpload(id: string): UploadStatus | undefined {
    return this.uploads.get(id);
  }

  getAllUploads(): UploadStatus[] {
    return Array.from(this.uploads.values());
  }

  getActiveUploads(): UploadStatus[] {
    return this.getAllUploads().filter(u => 
      u.status === 'uploading' || u.status === 'pending' || u.status === 'paused'
    );
  }

  getCompletedUploads(): UploadStatus[] {
    return this.getAllUploads().filter(u => u.status === 'completed');
  }

  getFailedUploads(): UploadStatus[] {
    return this.getAllUploads().filter(u => u.status === 'error');
  }

  getBatch(id: string): UploadBatch | undefined {
    return this.batches.get(id);
  }

  getAllBatches(): UploadBatch[] {
    return Array.from(this.batches.values());
  }

  // Statistics
  getTotalProgress(): number {
    const uploads = this.getAllUploads();
    if (uploads.length === 0) return 0;

    const totalBytes = uploads.reduce((sum, u) => sum + u.fileSize, 0);
    const uploadedBytes = uploads.reduce((sum, u) => sum + u.uploadedBytes, 0);

    return totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
  }

  getOverallUploadSpeed(): number {
    const activeUploads = this.getActiveUploads();
    return activeUploads.reduce((sum, u) => sum + u.uploadSpeed, 0);
  }

  getEstimatedTimeRemaining(): number {
    const activeUploads = this.getActiveUploads();
    if (activeUploads.length === 0) return 0;

    return Math.max(...activeUploads.map(u => u.timeRemaining));
  }

  // Cleanup
  removeUpload(id: string): void {
    this.stopProgressTracking(id);
    this.uploads.delete(id);
    toastManager.cancelProgress(id);
  }

  removeBatch(id: string): void {
    const batch = this.batches.get(id);
    if (batch) {
      batch.uploads.forEach(upload => this.removeUpload(upload.id));
      this.batches.delete(id);
    }
  }

  clear(): void {
    this.progressIntervals.forEach(interval => clearInterval(interval));
    this.progressIntervals.clear();
    this.uploads.clear();
    this.batches.clear();
    toastManager.dismissAll();
  }
}

export const uploadStatusTracker = new UploadStatusTracker();