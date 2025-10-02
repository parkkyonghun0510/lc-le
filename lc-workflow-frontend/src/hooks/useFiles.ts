import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { File as ApiFile, PaginatedResponse, CustomerApplication, User } from '@/types/models';
import toast from 'react-hot-toast';
import { handleApiError } from '@/lib/handleApiError';
import { API_ORIGIN_FOR_LINKS } from '@/lib/api';

// Define Folder type based on backend schema
export interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  application_id?: string;
  created_at: string;
  updated_at: string;
}

// Define Customer type with file counts
export interface CustomerWithFileCounts extends User {
  file_count: number;
  application_count: number;
}

// Define Application with file counts
export interface ApplicationWithFileCounts extends CustomerApplication {
  file_count: number;
}

// File query keys
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (params: any) => [...fileKeys.lists(), params] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
  thumbnail: (id: string) => [...fileKeys.all, 'thumbnail', id] as const,
};

// Folder query keys
export const folderKeys = {
  all: ['folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  list: (params: any) => [...folderKeys.lists(), params] as const,
  details: () => [...folderKeys.all, 'detail'] as const,
  detail: (id: string) => [...folderKeys.details(), id] as const,
};

// Customer and Application query keys
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params: any) => [...customerKeys.lists(), params] as const,
  applications: (customerId: string) => [...customerKeys.all, customerId, 'applications'] as const,
};

export const applicationKeys = {
  all: ['customer-applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (params: any) => [...applicationKeys.lists(), params] as const,
  byCustomer: (customerId: string) => [...applicationKeys.all, 'customer', customerId] as const,
  files: (applicationId: string) => [...applicationKeys.all, applicationId, 'files'] as const,
};

// File API functions
const fileApi = {
  getFiles: async (params: {
    // Back-compat: accept skip/limit but translate to page/size expected by backend
    skip?: number;
    limit?: number;
    page?: number;
    size?: number;
    application_id?: string;
    folder_id?: string;
    search?: string;
  }): Promise<PaginatedResponse<ApiFile>> => {
    const searchParams = new URLSearchParams();

    // Translate skip/limit to page/size if provided (page = floor(skip/size) + 1)
    const size = params.size ?? params.limit;
    const page = params.page ?? (params.skip !== undefined && size ? Math.floor(params.skip / size) + 1 : undefined) ?? 1;

    if (page !== undefined) searchParams.append('page', page.toString());
    if (size !== undefined) searchParams.append('size', size.toString());
    if (params.application_id) searchParams.append('application_id', params.application_id);
    if (params.folder_id) searchParams.append('folder_id', params.folder_id);
    if (params.search) searchParams.append('search', params.search);
    
    return apiClient.get(`/files/?${searchParams.toString()}`);
  },

  getFile: async (id: string): Promise<ApiFile> => {
    return apiClient.get(`/files/${id}`);
  },

  uploadFile: async (
    file: globalThis.File,
    applicationId?: string,
    onProgress?: (progress: number) => void,
    folderId?: string,
    documentType?: 'photos' | 'references' | 'supporting_docs' | 'borrower_photo' | 'borrower_id' | 'borrower_income_proof' | 'guarantor_photo' | 'guarantor_id' | 'guarantor_income_proof' | 'collateral_photo' | 'collateral_document' | 'land_title' | 'contract' | 'other',
    fieldName?: string
  ): Promise<ApiFile> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Send parameters as form data
    if (applicationId) {
      formData.append('application_id', applicationId);
    }
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    if (documentType) {
      formData.append('document_type', documentType);
    }
    if (fieldName) {
      formData.append('field_name', fieldName);
    }

    // Upload file to specified folder if provided

    return apiClient.post(`/files/upload`, formData, {
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
    const baseUrl = API_ORIGIN_FOR_LINKS;
    return `${baseUrl}/files/${id}/download`;
  },
  
  getThumbnailUrl: (id: string, size: 'sm' | 'md' | 'lg' = 'md'): string => {
    const baseUrl = API_ORIGIN_FOR_LINKS;
    return `${baseUrl}/files/${id}/thumbnail?size=${size}`;
  },
};

// Folder API functions
const folderApi = {
  getFolders: async (params: {
    page?: number;
    size?: number;
    parent_id?: string;
    application_id?: string;
  } = {}): Promise<PaginatedResponse<Folder>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.size) searchParams.append('size', params.size.toString());
    if (params.parent_id) searchParams.append('parent_id', params.parent_id);
    if (params.application_id) searchParams.append('application_id', params.application_id);
    
    const response = await apiClient.get(`/folders/?${searchParams.toString()}`);
    
    // If response is an array (non-paginated), convert to paginated format
    if (Array.isArray(response)) {
      return {
        items: response.map((folder: any) => ({
          ...folder,
          type: 'folder' as const,
          file_count: folder.file_count || 0
        })),
        total: response.length,
        page: 1,
        size: response.length,
        pages: 1
      };
    }
    
    // If response is already paginated, just add the type field
    const paginatedResponse = response as PaginatedResponse<any>;
    return {
      items: paginatedResponse.items.map((folder: any) => ({
        ...folder,
        type: 'folder' as const,
        file_count: folder.file_count || 0
      })),
      total: paginatedResponse.total,
      page: paginatedResponse.page,
      size: paginatedResponse.size,
      pages: paginatedResponse.pages
    };
  },
  
  getFolder: async (id: string): Promise<Folder> => {
    return apiClient.get(`/folders/${id}`);
  },
  
  createFolder: async (data: {
    name: string;
    parent_id?: string;
    application_id?: string;
  }): Promise<Folder> => {
    return apiClient.post('/folders/', data);
  },
  
  updateFolder: async (id: string, data: {
    name?: string;
    parent_id?: string;
  }): Promise<Folder> => {
    return apiClient.patch(`/folders/${id}`, data);
  },
  
  deleteFolder: async (id: string): Promise<void> => {
    return apiClient.delete(`/folders/${id}`);
  },
};

// Customer API functions
const customerApi = {
  getCustomers: async (params: {
    page?: number;
    size?: number;
    search?: string;
  } = {}): Promise<PaginatedResponse<CustomerWithFileCounts>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.size) searchParams.append('size', params.size.toString());
    if (params.search) searchParams.append('search', params.search);
    
    return apiClient.get(`/customers?${searchParams.toString()}`);
  },
  
  getCustomerApplications: async (customerId: string): Promise<ApplicationWithFileCounts[]> => {
    return apiClient.get(`/customers/${customerId}/applications`);
  },
};

// Application API functions
const applicationApi = {
  getApplications: async (params: {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
  } = {}): Promise<PaginatedResponse<CustomerApplication>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.size) searchParams.append('size', params.size.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    
    return apiClient.get(`/applications?${searchParams.toString()}`);
  },
  
  getApplicationsByCustomer: async (customerId: string): Promise<ApplicationWithFileCounts[]> => {
    // Use the new customer applications endpoint if available
    try {
      return await customerApi.getCustomerApplications(customerId);
    } catch (error) {
      // Fallback to the old method if the new endpoint is not available
      const data = await apiClient.get<PaginatedResponse<CustomerApplication>>(`/applications?size=1000`);
      return (data.items || []).filter(app => app.user_id === customerId) as ApplicationWithFileCounts[];
    }
  },
  
  getApplicationFiles: async (applicationId: string, params: {
    page?: number;
    size?: number;
  } = {}): Promise<PaginatedResponse<ApiFile>> => {
    return fileApi.getFiles({
      ...params,
      application_id: applicationId,
    });
  },
};

// File hooks
export const useFiles = (params: {
  skip?: number;
  limit?: number;
  page?: number;
  size?: number;
  application_id?: string;
  folder_id?: string;
  search?: string;
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

export const useFileThumbnail = (id: string, _size: 'sm' | 'md' | 'lg' = 'md') => {
  // Backend thumbnail endpoint is not available; use presigned download URL for now
  return useQuery<string | null>({
    queryKey: fileKeys.thumbnail(id),
    queryFn: async () => {
      if (!id) return null;
      const res = (await apiClient.get(`/files/${id}/download`)) as { download_url?: string };
      return res?.download_url ?? null;
    },
    enabled: !!id,
    select: (data) => data ?? null,
    staleTime: 30 * 1000,
  });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      file, 
      applicationId, 
      onProgress,
      folderId,
      documentType,
      fieldName,
    }: { 
      file: globalThis.File; 
      applicationId?: string; 
      onProgress?: (progress: number) => void;
      folderId?: string;
      documentType?: 'photos' | 'references' | 'supporting_docs' | 'borrower_photo' | 'borrower_id' | 'borrower_income_proof' | 'guarantor_photo' | 'guarantor_id' | 'guarantor_income_proof' | 'collateral_photo' | 'collateral_document' | 'land_title' | 'contract' | 'other';
      fieldName?: string;
    }) => fileApi.uploadFile(file, applicationId, onProgress, folderId, documentType, fieldName),
    onSuccess: (data) => {
      // Invalidate multiple query keys to ensure all related data is refreshed
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      
      // If the file was uploaded to a folder, invalidate folder queries
      if (data.folder_id) {
        queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      }
      
      // If the file was uploaded to an application, invalidate application queries
      if (data.application_id) {
        queryClient.invalidateQueries({ 
          queryKey: applicationKeys.files(data.application_id) 
        });
      }
      
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
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
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
        const response = (await apiClient.get(`/files/${id}/download`)) as { download_url?: string };
        const download_url = response?.download_url;

        if (download_url) {
          // Validate URL format before using
          try {
            new URL(download_url);
          } catch (urlError) {
            throw new Error('Invalid download URL format');
          }

          // Create a temporary link for the presigned URL
          const link = document.createElement('a');
          link.href = download_url;
          link.download = filename;
          link.target = '_blank'; // Open in new tab for security
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          throw new Error('No download URL provided by server');
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to download file';
        toast.error(`Download failed: ${errorMessage}`);
      }
    },
  };
};

// Folder hooks
export const useFolders = (params: {
  page?: number;
  size?: number;
  parent_id?: string;
  application_id?: string;
} = {}) => {
  return useQuery({
    queryKey: folderKeys.list(params),
    queryFn: () => folderApi.getFolders(params),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useFolder = (id: string) => {
  return useQuery({
    queryKey: folderKeys.detail(id),
    queryFn: () => folderApi.getFolder(id),
    enabled: !!id,
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      parent_id?: string;
      application_id?: string;
    }) => folderApi.createFolder(data),
    onSuccess: (data) => {
      // Invalidate all folder queries
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      
      // If the folder was created for an application, invalidate application queries
      if (data.application_id) {
        queryClient.invalidateQueries({ 
          queryKey: applicationKeys.all
        });
      }
      
      toast.success('Folder created successfully');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to create folder');
    },
  });
};

export const useUpdateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parent_id?: string } }) => 
      folderApi.updateFolder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      toast.success('Folder updated successfully');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to update folder');
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => folderApi.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      toast.success('Folder deleted successfully');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to delete folder');
    },
  });
};

// Customer hooks
export const useCustomers = (params: {
  page?: number;
  size?: number;
  search?: string;
} = {}) => {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerApi.getCustomers(params),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useCustomerApplications = (customerId: string) => {
  return useQuery({
    queryKey: customerKeys.applications(customerId),
    queryFn: () => customerApi.getCustomerApplications(customerId),
    enabled: !!customerId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Application hooks
export const useApplications = (params: {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
} = {}) => {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: () => applicationApi.getApplications(params),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useApplicationsByCustomer = (customerId: string) => {
  return useQuery({
    queryKey: applicationKeys.byCustomer(customerId),
    queryFn: () => applicationApi.getApplicationsByCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useApplicationFiles = (applicationId: string, params: {
  page?: number;
  size?: number;
} = {}) => {
  return useQuery({
    queryKey: applicationKeys.files(applicationId),
    queryFn: () => applicationApi.getApplicationFiles(applicationId, params),
    enabled: !!applicationId,
    staleTime: 30 * 1000, // 30 seconds
  });
};
