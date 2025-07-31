import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { File as CustomFile, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';

// File query keys
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (filters: any) => [...fileKeys.lists(), filters] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
};

// File hooks
export const useFiles = (filters: {
  page?: number;
  size?: number;
  application_id?: string;
  uploaded_by?: string;
  search?: string;
} = {}) => {
  return useQuery({
    queryKey: fileKeys.list(filters),
    queryFn: () => apiClient.get<PaginatedResponse<CustomFile>>('/files', {
      params: filters,
    }),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useFile = (id: string) => {
  return useQuery({
    queryKey: fileKeys.detail(id),
    queryFn: () => apiClient.get<CustomFile>(`/files/${id}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && id !== 'undefined' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id),
  });
};

export const useUploadFile = (applicationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, application_id }: { file: globalThis.File; application_id?: string }) => {
      const url = '/files/upload';
      const formData = new FormData();
      formData.append('file', file);
      if (application_id || applicationId) {
        formData.append('application_id', application_id || applicationId!);
      }
      return apiClient.post<CustomFile>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      toast.success('File uploaded successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to upload file';
      toast.error(message);
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!id || id === 'undefined' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
        throw new Error('Invalid file ID format');
      }
      return apiClient.delete(`/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      toast.success('File deleted successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete file';
      toast.error(message);
    },
  });
};

export const useDownloadFile = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      if (!id || id === 'undefined' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
        throw new Error('Invalid file ID format');
      }
      const response = await apiClient.get<Blob>(`/files/${id}/download`, {
        responseType: 'blob',
      });
      return response;
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to download file';
      toast.error(message);
    },
  });
};

// Utility hook for downloading files
export const useFileDownload = () => {
  const downloadFile = useDownloadFile();

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const blob = await downloadFile.mutateAsync(fileId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return {
    downloadFile: handleDownload,
    isDownloading: downloadFile.isPending,
  };
};

// File upload progress hook
export const useFileUploadWithProgress = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const uploadFile = useMutation({
    mutationFn: ({ file, application_id }: { file: globalThis.File; application_id?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (application_id) {
        formData.append('application_id', application_id);
      }

      return apiClient.post<CustomFile>('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      toast.success('File uploaded successfully!');
      setUploadProgress(0);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to upload file';
      toast.error(message);
      setUploadProgress(0);
    },
  });

  return {
    uploadFile,
    uploadProgress,
  };
};