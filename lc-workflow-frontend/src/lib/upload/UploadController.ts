import { UploadTask, UploadQueueManager, UploadQueueConfig } from './UploadQueueManager';
import { RetryManager, RetryConfig } from './RetryManager';

export interface UploadOptions {
  queue?: Partial<UploadQueueConfig>;
  retry?: Partial<RetryConfig>;
  onProgress?: (taskId: string, progress: number) => void;
  onComplete?: (taskId: string, result: any) => void;
  onError?: (taskId: string, error: Error) => void;
  onCancel?: (taskId: string) => void;
  onQueueChange?: (stats: any) => void;
}

export interface UploadSession {
  id: string;
  tasks: Map<string, UploadTask>;
  abortController: AbortController;
  startTime: number;
  isActive: boolean;
}

export class UploadController {
  private queueManager: UploadQueueManager;
  private retryManager: RetryManager;
  private sessions = new Map<string, UploadSession>();
  private globalAbortController = new AbortController();
  private options: UploadOptions;
  private uploadFileFn?: (file: File, applicationId?: string, onProgress?: (progress: number) => void, documentType?: string, fieldName?: string) => Promise<any>;

  constructor(options: UploadOptions = {}, uploadFileFn?: (file: File, applicationId?: string, onProgress?: (progress: number) => void, documentType?: string, fieldName?: string) => Promise<any>) {
    this.options = options;
    this.uploadFileFn = uploadFileFn;
    this.queueManager = new UploadQueueManager(options.queue);
    this.retryManager = new RetryManager(options.retry);

    // Set up global cancellation
    this.globalAbortController.signal.addEventListener('abort', () => {
      this.cancelAll();
    });
  }

  /**
   * Create a new upload session
   */
  createSession(sessionId?: string): string {
    const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: UploadSession = {
      id,
      tasks: new Map(),
      abortController: new AbortController(),
      startTime: Date.now(),
      isActive: true,
    };

    this.sessions.set(id, session);
    return id;
  }

  /**
   * Upload a single file with full control
   */
  async uploadFile(
    file: File,
    category: string | null,
    sessionId?: string,
    options: Partial<UploadOptions> = {}
  ): Promise<string> {
    const mergedOptions = { ...this.options, ...options };
    let session: UploadSession;

    if (sessionId) {
      const existingSession = this.getSession(sessionId);
      if (!existingSession) {
        throw new Error('Invalid session');
      }
      session = existingSession;
    } else {
      const newSessionId = this.createSession();
      const newSession = this.getSession(newSessionId);
      if (!newSession) {
        throw new Error('Failed to create session');
      }
      session = newSession;
    }

    const taskId = this.queueManager.addTask({
      file,
      category,
      priority: 1,
      onProgress: (progress) => {
        mergedOptions.onProgress?.(taskId, progress);
      },
      onComplete: (result) => {
        mergedOptions.onComplete?.(taskId, result);
        this.removeTaskFromSession(session.id, taskId);
      },
      onError: (error) => {
        mergedOptions.onError?.(taskId, error);
        this.removeTaskFromSession(session.id, taskId);
      },
    });

    const task = this.queueManager.getTasks().find(t => t.id === taskId);
    if (task) {
      session.tasks.set(taskId, task);
    }

    // Set up session-level cancellation
    session.abortController.signal.addEventListener('abort', () => {
      this.queueManager.cancelTask(taskId);
      mergedOptions.onCancel?.(taskId);
    });

    return taskId;
  }

  /**
   * Upload multiple files in parallel
   */
  async uploadFiles(
    files: Array<{ file: File; category: string | null; priority?: number }>,
    sessionId?: string,
    options: Partial<UploadOptions> = {}
  ): Promise<string[]> {
    const mergedOptions = { ...this.options, ...options };
    let session: UploadSession;

    if (sessionId) {
      const existingSession = this.getSession(sessionId);
      if (!existingSession) {
        throw new Error('Invalid session');
      }
      session = existingSession;
    } else {
      const newSessionId = this.createSession();
      const newSession = this.getSession(newSessionId);
      if (!newSession) {
        throw new Error('Failed to create session');
      }
      session = newSession;
    }

    const taskIds: string[] = [];

    // Add all tasks to queue
    for (const { file, category, priority } of files) {
      const taskId = this.queueManager.addTask({
        file,
        category,
        priority: priority ?? 1,
        onProgress: (progress) => {
          mergedOptions.onProgress?.(taskId, progress);
        },
        onComplete: (result) => {
          mergedOptions.onComplete?.(taskId, result);
          this.removeTaskFromSession(session.id, taskId);
        },
        onError: (error) => {
          mergedOptions.onError?.(taskId, error);
          this.removeTaskFromSession(session.id, taskId);
        },
      });

      taskIds.push(taskId);
      const task = this.queueManager.getTasks().find(t => t.id === taskId);
      if (task) {
        session.tasks.set(taskId, task);
      }
    }

    // Set up session-level cancellation
    session.abortController.signal.addEventListener('abort', () => {
      taskIds.forEach(taskId => {
        this.queueManager.cancelTask(taskId);
        mergedOptions.onCancel?.(taskId);
      });
    });

    return taskIds;
  }

  /**
   * Cancel a specific upload task
   */
  cancelUpload(taskId: string): boolean {
    return this.queueManager.cancelTask(taskId);
  }

  /**
   * Cancel all uploads in a session
   */
  cancelSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.abortController.abort();
      session.isActive = false;
      return true;
    }
    return false;
  }

  /**
   * Cancel all uploads across all sessions
   */
  cancelAll(): void {
    this.globalAbortController.abort();
    this.sessions.forEach(session => {
      session.abortController.abort();
      session.isActive = false;
    });
  }

  /**
   * Pause all uploads in a session
   */
  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.queueManager.pause();
      return true;
    }
    return false;
  }

  /**
   * Resume all uploads in a session
   */
  resumeSession(sessionId: string, maxConcurrent?: number): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.queueManager.resume(maxConcurrent);
      return true;
    }
    return false;
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): UploadSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): UploadSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  /**
   * Get upload statistics for a session
   */
  getSessionStats(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const taskIds = Array.from(session.tasks.keys());
    const tasks = this.queueManager.getTasks().filter(task => taskIds.includes(task.id));

    const stats = {
      sessionId,
      taskCount: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      uploading: tasks.filter(t => t.status === 'uploading').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      progress: 0,
      isActive: session.isActive,
      startTime: session.startTime,
      duration: Date.now() - session.startTime,
    };

    if (stats.taskCount > 0) {
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      stats.progress = (completedTasks / stats.taskCount) * 100;
    }

    return stats;
  }

  /**
   * Get global upload statistics
   */
  getGlobalStats() {
    return this.queueManager.getStats();
  }

  /**
   * Remove a task from a session (cleanup)
   */
  private removeTaskFromSession(sessionId: string, taskId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.tasks.delete(taskId);

      // Clean up empty sessions
      if (session.tasks.size === 0 && !session.isActive) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Clean up completed/failed/cancelled sessions
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      const isOld = (now - session.startTime) > maxAge;
      const hasNoActiveTasks = Array.from(session.tasks.values())
        .every(task => {
          const taskInfo = this.queueManager.getTasks().find(t => t.id === task.id);
          return taskInfo ? ['completed', 'failed', 'cancelled'].includes(taskInfo.status) : true;
        });

      if (isOld || (hasNoActiveTasks && !session.isActive)) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Update session options
   */
  updateOptions(newOptions: Partial<UploadOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Destroy the controller and clean up all resources
   */
  destroy(): void {
    this.cancelAll();
    this.sessions.clear();
  }
}