import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { File, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';
import { handleApiError } from '@/lib/handleApiError';

// File query keys
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (params: any) => [...fileKeys.lists(), params] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
};

// File API functions
const fileApi = {
  getFiles: async (params: {
    skip?: number;
    limit?: number;
    application_id?: string;
  }): Promise<PaginatedResponse<File>> => {
    const searchParams = new URLSearchParams();
    if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.application_id) searchParams.append('application_id', params.application_id);
    
    return apiClient.get(`/files?${searchParams.toString()}`);
  },

  getFile: async (id: string): Promise<File> => {
    return apiClient.get(`/files/${id}`);
  },

  uploadFile: async (file: File, applicationId?: string, onProgress?: (progress: number) => void): Promise<File> => {
    const formData = new FormData();
    formData.append('file', file);
    if (applicationId) {
      formData.append('application_id', applicationId);
    }

    return apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  deleteFile: async (id: string): Promise<void> => {
    return apiClient.delete(`/files/${id}`);
  },

  downloadFile: (id: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    return `${baseUrl}/files/${id}/download`;
  },
};

// File hooks
export const useFiles = (params: {
  skip?: number;
  limit?: number;
  application_id?: string;
} = {}) => {
  return useQuery({
    queryKey: fileKeys.list(params),
    queryFn: () => fileApi.getFiles(params),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useFile = (id: string) => {
  return useQuery({
    queryKey: fileKeys.detail(id),
    queryFn: () => fileApi.getFile(id),
    enabled: !!id,
  });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      file, 
      applicationId, 
      onProgress 
    }: { 
      file: File; 
      applicationId?: string; 
      onProgress?: (progress: number) => void;
    }) => fileApi.uploadFile(file, applicationId, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      toast.success('File uploaded successfully');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to upload file');
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fileApi.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      toast.success('File deleted successfully');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to delete file');
    },
  });
};

export const useDownloadFile = () => {
  return {
    downloadFile: async (id: string, filename: string) => {
      try {
        const response = await apiClient.get(`/files/${id}/download`, {
          responseType: 'blob',
        });
        
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
        toast.error('Failed to download file');
      }
    },
  };
};