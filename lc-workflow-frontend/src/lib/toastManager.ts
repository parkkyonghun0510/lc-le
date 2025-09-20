import toast from 'react-hot-toast';
import { ToastType } from '@/components/ui/Toast';

export interface ToastOptions {
  duration?: number;
  persistent?: boolean;
  showProgress?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export interface ProgressToastOptions extends ToastOptions {
  onCancel?: () => void;
  onRetry?: () => void;
}

class ToastManager {
  private progressToasts = new Map<string, string>();

  // Enhanced success toast with optional actions
  success(title: string, message?: string, options?: ToastOptions) {
    return toast.success(
      message ? `${title}\n${message}` : title,
      {
        duration: options?.persistent ? Infinity : (options?.duration || 4000),
        style: {
          background: '#10b981',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '400px',
        },
        iconTheme: {
          primary: '#ffffff',
          secondary: '#10b981',
        },
      }
    );
  }

  // Enhanced error toast with retry functionality
  error(title: string, message?: string, options?: ToastOptions & { onRetry?: () => void }) {
    const actions = [];
    
    if (options?.onRetry) {
      actions.push({
        label: 'Retry',
        onClick: options.onRetry,
        variant: 'primary' as const,
      });
    }

    if (options?.actions) {
      actions.push(...options.actions);
    }

    return toast.error(
      message ? `${title}\n${message}` : title,
      {
        duration: options?.persistent ? Infinity : (options?.duration || 6000),
        style: {
          background: '#ef4444',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '400px',
        },
        iconTheme: {
          primary: '#ffffff',
          secondary: '#ef4444',
        },
      }
    );
  }

  // Warning toast
  warning(title: string, message?: string, options?: ToastOptions) {
    return toast(
      message ? `${title}\n${message}` : title,
      {
        duration: options?.persistent ? Infinity : (options?.duration || 5000),
        icon: '⚠️',
        style: {
          background: '#f59e0b',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '400px',
        },
      }
    );
  }

  // Info toast
  info(title: string, message?: string, options?: ToastOptions) {
    return toast(
      message ? `${title}\n${message}` : title,
      {
        duration: options?.persistent ? Infinity : (options?.duration || 4000),
        icon: 'ℹ️',
        style: {
          background: '#3b82f6',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '400px',
        },
      }
    );
  }

  // Progress toast for file uploads
  progress(
    id: string, 
    title: string, 
    progress: number, 
    options?: ProgressToastOptions
  ) {
    const message = `${Math.round(progress)}% complete`;
    
    // If this is a new progress toast, create it
    if (!this.progressToasts.has(id)) {
      const toastId = toast.loading(
        `${title}\n${message}`,
        {
          duration: Infinity,
          style: {
            background: '#6b7280',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
          },
        }
      );
      this.progressToasts.set(id, toastId);
      return toastId;
    }

    // Update existing progress toast
    const toastId = this.progressToasts.get(id)!;
    
    if (progress >= 100) {
      // Complete the progress toast
      toast.success(
        `${title}\nCompleted successfully!`,
        {
          id: toastId,
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
          },
        }
      );
      this.progressToasts.delete(id);
    } else {
      // Update progress
      toast.loading(
        `${title}\n${message}`,
        {
          id: toastId,
          style: {
            background: '#6b7280',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
          },
        }
      );
    }

    return toastId;
  }

  // Complete a progress toast with success
  completeProgress(id: string, title: string, message?: string) {
    const toastId = this.progressToasts.get(id);
    if (toastId) {
      toast.success(
        message ? `${title}\n${message}` : `${title}\nCompleted successfully!`,
        {
          id: toastId,
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
          },
        }
      );
      this.progressToasts.delete(id);
    }
  }

  // Fail a progress toast with error
  failProgress(id: string, title: string, message?: string, onRetry?: () => void) {
    const toastId = this.progressToasts.get(id);
    if (toastId) {
      toast.error(
        message ? `${title}\n${message}` : `${title}\nFailed to complete`,
        {
          id: toastId,
          duration: onRetry ? Infinity : 6000,
          style: {
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
          },
        }
      );
      this.progressToasts.delete(id);
    }
  }

  // Cancel a progress toast
  cancelProgress(id: string) {
    const toastId = this.progressToasts.get(id);
    if (toastId) {
      toast.dismiss(toastId);
      this.progressToasts.delete(id);
    }
  }

  // Dismiss a specific toast
  dismiss(toastId: string) {
    toast.dismiss(toastId);
  }

  // Dismiss all toasts
  dismissAll() {
    toast.dismiss();
    this.progressToasts.clear();
  }

  // Network status toasts
  networkOffline() {
    return this.warning(
      'Connection Lost',
      'You are currently offline. Files will be queued for upload when connection is restored.',
      { persistent: true }
    );
  }

  networkOnline() {
    return this.success(
      'Connection Restored',
      'You are back online. Processing queued uploads...',
      { duration: 3000 }
    );
  }

  // File upload specific toasts
  fileUploadQueued(filename: string) {
    return this.info(
      'File Queued',
      `${filename} will be uploaded when connection is restored.`,
      { duration: 4000 }
    );
  }

  fileUploadRetrying(filename: string, attempt: number) {
    return this.info(
      'Retrying Upload',
      `Attempting to upload ${filename} (attempt ${attempt})...`,
      { duration: 3000 }
    );
  }

  fileUploadFailed(filename: string, error: string, onRetry?: () => void) {
    return this.error(
      'Upload Failed',
      `Failed to upload ${filename}: ${error}`,
      { 
        duration: onRetry ? Infinity : 6000,
        onRetry,
        actions: onRetry ? [
          {
            label: 'Retry',
            onClick: onRetry,
            variant: 'primary'
          }
        ] : undefined
      }
    );
  }

  // Batch operation toasts
  batchOperationStart(operation: string, count: number) {
    return this.info(
      `${operation} Started`,
      `Processing ${count} items...`,
      { persistent: true }
    );
  }

  batchOperationComplete(operation: string, successCount: number, failCount: number) {
    if (failCount === 0) {
      return this.success(
        `${operation} Complete`,
        `Successfully processed ${successCount} items.`
      );
    } else {
      return this.warning(
        `${operation} Complete`,
        `${successCount} succeeded, ${failCount} failed.`
      );
    }
  }
}

export const toastManager = new ToastManager();