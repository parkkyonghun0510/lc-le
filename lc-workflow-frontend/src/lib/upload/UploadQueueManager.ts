export interface UploadTask {
  id: string;
  file: File;
  category: string | null;
  priority?: number;
  retries?: number;
  maxRetries?: number;
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  abortController?: AbortController;
}

export interface UploadQueueConfig {
  maxConcurrent: number;
  maxRetries: number;
  retryDelay: number;
  retryDelayMultiplier: number;
  chunkSize?: number;
  timeout?: number;
}

export interface UploadQueueStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  uploading: number;
  cancelled: number;
  averageSpeed: number;
  totalProgress: number;
}

export class UploadQueueManager {
  private queue: UploadTask[] = [];
  private activeUploads = new Set<string>();
  private completedUploads = new Set<string>();
  private failedUploads = new Set<string>();
  private cancelledUploads = new Set<string>();
  private config: UploadQueueConfig;
  private uploadStats = {
    startTime: 0,
    totalBytes: 0,
    uploadedBytes: 0,
    speeds: [] as number[]
  };
  private uploadFileFn?: (file: File, applicationId?: string, onProgress?: (progress: number) => void, documentType?: string, fieldName?: string) => Promise<any>;

  constructor(config: Partial<UploadQueueConfig> = {}, uploadFileFn?: (file: File, applicationId?: string, onProgress?: (progress: number) => void, documentType?: string, fieldName?: string) => Promise<any>) {
    this.config = {
      maxConcurrent: 3,
      maxRetries: 3,
      retryDelay: 1000,
      retryDelayMultiplier: 2,
      chunkSize: 1024 * 1024, // 1MB chunks for large files
      timeout: 30000, // 30 seconds
      ...config
    };
    this.uploadFileFn = uploadFileFn;
  }

  /**
   * Add a task to the upload queue
   */
  addTask(task: Omit<UploadTask, 'id' | 'abortController'>): string {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uploadTask: UploadTask = {
      ...task,
      id,
      abortController: new AbortController(),
      maxRetries: task.maxRetries ?? this.config.maxRetries,
      retries: 0
    };

    // Insert task based on priority (higher priority first)
    const priority = task.priority ?? 0;
    const insertIndex = this.queue.findIndex(t => (t.priority ?? 0) < priority);
    if (insertIndex === -1) {
      this.queue.push(uploadTask);
    } else {
      this.queue.splice(insertIndex, 0, uploadTask);
    }

    this.processQueue();
    return id;
  }

  /**
   * Add multiple tasks to the queue
   */
  addTasks(tasks: Array<Omit<UploadTask, 'id' | 'abortController'>>): string[] {
    return tasks.map(task => this.addTask(task));
  }

  /**
   * Cancel a specific upload task
   */
  cancelTask(taskId: string): boolean {
    const task = this.queue.find(t => t.id === taskId);
    if (task) {
      task.abortController?.abort();
      this.activeUploads.delete(taskId);
      this.cancelledUploads.add(taskId);
      this.processQueue();
      return true;
    }
    return false;
  }

  /**
   * Cancel all upload tasks
   */
  cancelAll(): void {
    this.queue.forEach(task => {
      task.abortController?.abort();
    });
    this.activeUploads.clear();
    this.cancelledUploads = new Set([...this.cancelledUploads, ...this.queue.map(t => t.id)]);
    this.processQueue();
  }

  /**
   * Pause the queue (stops processing new tasks)
   */
  pause(): void {
    this.config.maxConcurrent = 0;
  }

  /**
   * Resume the queue with specified concurrency
   */
  resume(maxConcurrent?: number): void {
    if (maxConcurrent) {
      this.config.maxConcurrent = maxConcurrent;
    }
    this.processQueue();
  }

  /**
   * Get current queue statistics
   */
  getStats(): UploadQueueStats {
    const total = this.queue.length + this.activeUploads.size + this.completedUploads.size + this.failedUploads.size;
    const completed = this.completedUploads.size;
    const failed = this.failedUploads.size;
    const pending = this.queue.length;
    const uploading = this.activeUploads.size;
    const cancelled = this.cancelledUploads.size;

    const totalProgress = total > 0 ? (completed + failed + cancelled) / total * 100 : 0;
    const averageSpeed = this.uploadStats.speeds.length > 0
      ? this.uploadStats.speeds.reduce((a, b) => a + b, 0) / this.uploadStats.speeds.length
      : 0;

    return {
      total,
      completed,
      failed,
      pending,
      uploading,
      cancelled,
      averageSpeed,
      totalProgress
    };
  }

  /**
   * Get all tasks (for debugging/monitoring)
   */
  getTasks(): Array<UploadTask & { status: string }> {
    return this.queue.map(task => ({
      ...task,
      status: this.activeUploads.has(task.id) ? 'uploading'
        : this.completedUploads.has(task.id) ? 'completed'
        : this.failedUploads.has(task.id) ? 'failed'
        : this.cancelledUploads.has(task.id) ? 'cancelled'
        : 'pending'
    }));
  }

  /**
   * Process the upload queue
   */
  private processQueue(): void {
    const availableSlots = this.config.maxConcurrent - this.activeUploads.size;

    if (availableSlots <= 0 || this.queue.length === 0) {
      return;
    }

    // Start new uploads up to the available slots
    const tasksToStart = this.queue
      .filter(task => !this.activeUploads.has(task.id) &&
                     !this.completedUploads.has(task.id) &&
                     !this.failedUploads.has(task.id) &&
                     !this.cancelledUploads.has(task.id))
      .slice(0, availableSlots);

    tasksToStart.forEach(task => {
      this.startUpload(task);
    });
  }

  /**
   * Start an individual upload task
   */
  private async startUpload(task: UploadTask): Promise<void> {
    this.activeUploads.add(task.id);
    this.uploadStats.startTime = Date.now();

    try {
      await this.executeUpload(task);
      this.completedUploads.add(task.id);
      task.onComplete?.(null);
    } catch (error) {
      if (task.abortController?.signal.aborted) {
        this.cancelledUploads.add(task.id);
      } else {
        this.failedUploads.add(task.id);
        task.onError?.(error as Error);
      }
    } finally {
      this.activeUploads.delete(task.id);
      // Remove from queue after processing
      const queueIndex = this.queue.findIndex(t => t.id === task.id);
      if (queueIndex > -1) {
        this.queue.splice(queueIndex, 1);
      }
      this.processQueue();
    }
  }

  /**
   * Execute the actual upload with retry logic
   */
  private async executeUpload(task: UploadTask): Promise<void> {
    const uploadFunction = async (): Promise<void> => {
      if (!this.uploadFileFn) {
        throw new Error('No upload function provided');
      }

      // Use the actual upload function with proper parameters
      await this.uploadFileFn(
        task.file,
        undefined, // applicationId - will be passed separately if needed
        (progress) => {
          // Update progress through the task callback
          task.onProgress?.(progress);
        },
        task.category || undefined,
        task.category || undefined
      );
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (task.maxRetries ?? this.config.maxRetries); attempt++) {
      try {
        if (task.abortController?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        await uploadFunction();
        return; // Success, exit retry loop

      } catch (error) {
        lastError = error as Error;

        if (task.abortController?.signal.aborted) {
          throw lastError;
        }

        if (attempt < (task.maxRetries ?? this.config.maxRetries)) {
          const delay = this.config.retryDelay * Math.pow(this.config.retryDelayMultiplier, attempt);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Upload failed after all retries');
  }

  /**
   * Simulate upload for testing purposes
   */
  private async simulateUpload(task: UploadTask): Promise<void> {
    const totalSize = task.file.size;
    const chunkSize = this.config.chunkSize || 1024 * 1024;
    const chunks = Math.ceil(totalSize / chunkSize);

    for (let chunk = 0; chunk < chunks; chunk++) {
      if (task.abortController?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      // Simulate upload time based on chunk size
      const chunkProgress = ((chunk + 1) / chunks) * 100;
      task.onProgress?.(Math.min(chunkProgress, 100));

      // Update speed tracking
      const now = Date.now();
      if (this.uploadStats.startTime > 0) {
        const elapsed = now - this.uploadStats.startTime;
        const speed = (chunk * chunkSize) / (elapsed / 1000); // bytes per second
        this.uploadStats.speeds.push(speed);

        // Keep only last 10 speed measurements
        if (this.uploadStats.speeds.length > 10) {
          this.uploadStats.speeds.shift();
        }
      }

      // Simulate network delay
      await this.delay(100 + Math.random() * 200);
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}