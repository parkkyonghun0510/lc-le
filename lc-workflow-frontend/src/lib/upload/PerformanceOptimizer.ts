export interface ChunkUploadOptions {
  chunkSize: number;
  maxConcurrentChunks: number;
  retryAttempts: number;
  progressInterval: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // estimated seconds remaining
  chunkProgress?: {
    current: number;
    total: number;
  };
}

export interface PerformanceMetrics {
  uploadSpeed: number;
  averageChunkTime: number;
  totalChunks: number;
  successfulChunks: number;
  failedChunks: number;
  retryCount: number;
  bandwidthUtilization: number;
  memoryUsage: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private progressCallbacks = new Map<string, (progress: UploadProgress) => void>();
  private metricsCallbacks = new Map<string, (metrics: PerformanceMetrics) => void>();
  private chunkProgress = new Map<string, { current: number; total: number }>();
  private speedMeasurements = new Map<string, number[]>();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Upload file in chunks for better performance and memory management
   */
  async uploadFileInChunks(
    file: File,
    uploadChunk: (chunk: Blob, start: number, end: number) => Promise<void>,
    options: Partial<ChunkUploadOptions> = {},
    onProgress?: (progress: UploadProgress) => void,
    onComplete?: (metrics: PerformanceMetrics) => void
  ): Promise<PerformanceMetrics> {
    const opts: ChunkUploadOptions = {
      chunkSize: 1024 * 1024, // 1MB default
      maxConcurrentChunks: 3,
      retryAttempts: 3,
      progressInterval: 100,
      ...options,
    };

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / opts.chunkSize);
    const metrics: PerformanceMetrics = {
      uploadSpeed: 0,
      averageChunkTime: 0,
      totalChunks,
      successfulChunks: 0,
      failedChunks: 0,
      retryCount: 0,
      bandwidthUtilization: 0,
      memoryUsage: 0,
    };

    // Set up progress tracking
    if (onProgress) {
      this.progressCallbacks.set(uploadId, onProgress);
    }

    const startTime = Date.now();
    let uploadedBytes = 0;
    const chunkTimes: number[] = [];

    try {
      // Process chunks with controlled concurrency
      for (let i = 0; i < totalChunks; i += opts.maxConcurrentChunks) {
        const chunkPromises = [];

        for (let j = 0; j < opts.maxConcurrentChunks && i + j < totalChunks; j++) {
          const chunkIndex = i + j;
          const start = chunkIndex * opts.chunkSize;
          const end = Math.min(start + opts.chunkSize, totalSize);
          const chunk = file.slice(start, end);

          chunkPromises.push(this.uploadChunkWithRetry(
            chunk,
            start,
            end,
            uploadChunk,
            opts.retryAttempts,
            uploadId,
            chunkIndex,
            totalChunks
          ));
        }

        // Wait for batch to complete
        const results = await Promise.allSettled(chunkPromises);

        // Process results
        for (const result of results) {
          if (result.status === 'fulfilled') {
            metrics.successfulChunks++;
            chunkTimes.push(result.value.chunkTime);
          } else {
            metrics.failedChunks++;
            console.error('Chunk upload failed:', result.reason);
          }
        }

        // Update progress
        uploadedBytes = Math.min((i + opts.maxConcurrentChunks) * opts.chunkSize, totalSize);
        this.updateProgress(uploadId, uploadedBytes, totalSize, startTime);

        // Memory cleanup
        if (i % 10 === 0) {
          this.forceMemoryCleanup();
        }
      }

      // Calculate final metrics
      const totalTime = Date.now() - startTime;
      metrics.uploadSpeed = totalSize / (totalTime / 1000);
      metrics.averageChunkTime = chunkTimes.length > 0
        ? chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length
        : 0;
      metrics.bandwidthUtilization = this.calculateBandwidthUtilization(metrics.uploadSpeed);
      metrics.memoryUsage = this.getMemoryUsage();

      onComplete?.(metrics);
      return metrics;

    } finally {
      this.cleanup(uploadId);
    }
  }

  /**
   * Upload a single chunk with retry logic
   */
  private async uploadChunkWithRetry(
    chunk: Blob,
    start: number,
    end: number,
    uploadChunk: (chunk: Blob, start: number, end: number) => Promise<void>,
    maxRetries: number,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number
  ): Promise<{ chunkTime: number }> {
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await uploadChunk(chunk, start, end);

        // Update chunk progress
        this.chunkProgress.set(uploadId, {
          current: chunkIndex + 1,
          total: totalChunks,
        });

        return { chunkTime: Date.now() - startTime };

      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Chunk ${chunkIndex} failed after ${maxRetries} attempts: ${error}`);
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await this.delay(delay);
      }
    }

    throw new Error(`Chunk ${chunkIndex} failed unexpectedly`);
  }

  /**
   * Update progress for an upload
   */
  private updateProgress(uploadId: string, loaded: number, total: number, startTime: number): void {
    const now = Date.now();
    const elapsed = now - startTime;
    const percentage = (loaded / total) * 100;
    const speed = loaded / (elapsed / 1000);

    // Track speed measurements for smoothing
    if (!this.speedMeasurements.has(uploadId)) {
      this.speedMeasurements.set(uploadId, []);
    }
    const speeds = this.speedMeasurements.get(uploadId)!;
    speeds.push(speed);

    // Keep only recent measurements
    if (speeds.length > 10) {
      speeds.shift();
    }

    // Calculate average speed
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const remainingBytes = total - loaded;
    const remainingTime = remainingBytes / avgSpeed;

    const progress: UploadProgress = {
      loaded,
      total,
      percentage,
      speed: avgSpeed,
      remainingTime,
      chunkProgress: this.chunkProgress.get(uploadId),
    };

    this.progressCallbacks.get(uploadId)?.(progress);
  }

  /**
   * Calculate bandwidth utilization (0-1)
   */
  private calculateBandwidthUtilization(uploadSpeed: number): number {
    // Estimate available bandwidth (this is a simplified calculation)
    // In a real implementation, you might measure actual network capacity
    const estimatedMaxSpeed = 10 * 1024 * 1024; // 10 MB/s assumed max
    return Math.min(uploadSpeed / estimatedMaxSpeed, 1);
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
    }
    return 0;
  }

  /**
   * Force garbage collection if available
   */
  private forceMemoryCleanup(): void {
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Clean up tracking data
   */
  private cleanup(uploadId: string): void {
    this.progressCallbacks.delete(uploadId);
    this.metricsCallbacks.delete(uploadId);
    this.chunkProgress.delete(uploadId);
    this.speedMeasurements.delete(uploadId);
  }

  /**
   * Monitor upload performance across multiple uploads
   */
  monitorPerformance(
    uploadId: string,
    onMetrics: (metrics: PerformanceMetrics) => void
  ): void {
    this.metricsCallbacks.set(uploadId, onMetrics);
  }

  /**
   * Optimize upload settings based on current performance
   */
  optimizeSettings(currentMetrics: PerformanceMetrics): Partial<ChunkUploadOptions> {
    const recommendations: Partial<ChunkUploadOptions> = {};

    // Adjust chunk size based on performance
    if (currentMetrics.averageChunkTime > 5000) {
      // Slow uploads - increase chunk size to reduce overhead
      recommendations.chunkSize = 2 * 1024 * 1024; // 2MB
    } else if (currentMetrics.averageChunkTime < 1000) {
      // Fast uploads - decrease chunk size for better progress tracking
      recommendations.chunkSize = 512 * 1024; // 512KB
    }

    // Adjust concurrency based on bandwidth utilization
    if (currentMetrics.bandwidthUtilization < 0.5) {
      // Low bandwidth usage - increase concurrency
      recommendations.maxConcurrentChunks = 5;
    } else if (currentMetrics.bandwidthUtilization > 0.8) {
      // High bandwidth usage - decrease concurrency
      recommendations.maxConcurrentChunks = 2;
    }

    // Adjust retry attempts based on failure rate
    const failureRate = currentMetrics.failedChunks / currentMetrics.totalChunks;
    if (failureRate > 0.1) {
      recommendations.retryAttempts = 5;
    } else if (failureRate === 0) {
      recommendations.retryAttempts = 1;
    }

    return recommendations;
  }

  /**
   * Pre-allocate memory for large files to prevent fragmentation
   */
  preallocateMemory(fileSize: number): boolean {
    try {
      // Try to pre-allocate array buffer for large files
      if (fileSize > 100 * 1024 * 1024) { // 100MB+
        const buffer = new ArrayBuffer(Math.min(fileSize / 10, 50 * 1024 * 1024)); // 10% or 50MB max
        return true;
      }
    } catch (error) {
      console.warn('Memory pre-allocation failed:', error);
    }
    return false;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Progress aggregator for multiple uploads
 */
export class ProgressAggregator {
  private uploads = new Map<string, { progress: number; total: number; startTime: number }>();
  private aggregatedCallback?: (overall: UploadProgress) => void;

  addUpload(uploadId: string, total: number): void {
    this.uploads.set(uploadId, {
      progress: 0,
      total,
      startTime: Date.now(),
    });
  }

  updateProgress(uploadId: string, loaded: number): void {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.progress = loaded;
      this.calculateAggregatedProgress();
    }
  }

  removeUpload(uploadId: string): void {
    this.uploads.delete(uploadId);
    this.calculateAggregatedProgress();
  }

  setAggregatedCallback(callback: (overall: UploadProgress) => void): void {
    this.aggregatedCallback = callback;
  }

  private calculateAggregatedProgress(): void {
    if (this.uploads.size === 0) {
      this.aggregatedCallback?.({
        loaded: 0,
        total: 0,
        percentage: 0,
        speed: 0,
        remainingTime: 0,
      });
      return;
    }

    let totalLoaded = 0;
    let totalSize = 0;
    let totalSpeed = 0;
    const now = Date.now();

    for (const upload of this.uploads.values()) {
      totalLoaded += upload.progress;
      totalSize += upload.total;

      // Calculate speed for this upload
      const elapsed = (now - upload.startTime) / 1000;
      if (elapsed > 0) {
        const speed = upload.progress / elapsed;
        totalSpeed += speed;
      }
    }

    const percentage = totalSize > 0 ? (totalLoaded / totalSize) * 100 : 0;
    const avgSpeed = totalSpeed / this.uploads.size;
    const remainingBytes = totalSize - totalLoaded;
    const remainingTime = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

    this.aggregatedCallback?.({
      loaded: totalLoaded,
      total: totalSize,
      percentage,
      speed: avgSpeed,
      remainingTime,
    });
  }
}

/**
 * Adaptive chunk size calculator
 */
export class AdaptiveChunkSize {
  private history: Array<{ size: number; time: number; success: boolean }> = [];

  addMeasurement(chunkSize: number, time: number, success: boolean): void {
    this.history.push({ size: chunkSize, time, success });

    // Keep only recent measurements
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  getOptimalChunkSize(targetTime: number = 2000): number {
    if (this.history.length < 5) {
      return 1024 * 1024; // Default 1MB
    }

    // Find successful uploads within 20% of target time
    const relevant = this.history.filter(
      h => h.success && h.time >= targetTime * 0.8 && h.time <= targetTime * 1.2
    );

    if (relevant.length === 0) {
      // Fallback to average of successful uploads
      const successful = this.history.filter(h => h.success);
      if (successful.length > 0) {
        const avgSize = successful.reduce((sum, h) => sum + h.size, 0) / successful.length;
        return Math.round(avgSize);
      }
      return 1024 * 1024;
    }

    // Return median chunk size of relevant measurements
    const sorted = relevant.map(h => h.size).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
}