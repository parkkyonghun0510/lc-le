import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { 
  CustomerApplication, 
  CustomerApplicationCreate, 
  CustomerApplicationUpdate,
  WorkflowStatusInfo,
  WorkflowHistoryEntry,
  WorkflowTransitionRequest,
  ApprovalData,
  WorkflowStatus
} from '@/types/models';

export interface ApplicationsResponse {
  items: CustomerApplication[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApplicationFilters {
  search?: string;
  status?: string;
  workflow_status?: WorkflowStatus;
  page?: number;
  size?: number;
  amount_min?: number;
  amount_max?: number;
  date_from?: string;
  date_to?: string;
  officer_id?: string;
}

// Get applications list
export const useApplications = (filters: ApplicationFilters = {}) => {
  return useQuery<ApplicationsResponse>({  // Explicit type parameter
    queryKey: ['applications', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.workflow_status) params.append('workflow_status', filters.workflow_status);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.size) params.append('size', filters.size.toString());
      if (filters.amount_min) params.append('amount_min', filters.amount_min.toString());
      if (filters.amount_max) params.append('amount_max', filters.amount_max.toString());
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.officer_id) params.append('officer_id', filters.officer_id);
      
      return apiClient.get<ApplicationsResponse>(`/applications/?${params.toString()}`);  // Added generic type parameter
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Get single application
export const useApplication = (id: string) => {
  return useQuery<CustomerApplication>({
    queryKey: ['application', id],
    queryFn: () => apiClient.get<CustomerApplication>(`/applications/${id}`),
    enabled: !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Create application
export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation<CustomerApplication, Error, CustomerApplicationCreate>({
    mutationFn: async (data: CustomerApplicationCreate) => {
      return apiClient.post<CustomerApplication>('/applications/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('បានបង្កើតពាក្យសុំកម្ចីដោយជោគជ័យ');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'មានបញ្ហាក្នុងការបង្កើតពាក្យសុំ');
    },
  });
};

// Update application
export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation<CustomerApplication, Error, { id: string; data: CustomerApplicationUpdate }>({
    mutationFn: async ({ id, data }: { id: string; data: CustomerApplicationUpdate }) => {
      return apiClient.put<CustomerApplication>(`/applications/${id}`, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      toast.success('បានកែប្រែពាក្យសុំដោយជោគជ័យ');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'មានបញ្ហាក្នុងការកែប្រែពាក្យសុំ');
    },
  });
};

// Submit application
export const useSubmitApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation<CustomerApplication, Error, string>({
    mutationFn: async (id: string) => {
      return apiClient.patch<CustomerApplication>(`/applications/${id}/submit`, {});
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      toast.success('បានដាក់ស្នើពាក្យសុំដោយជោគជ័យ');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'មានបញ្ហាក្នុងការដាក់ស្នើពាក្យសុំ');
    },
  });
};

// Approve application
export const useApproveApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation<CustomerApplication, Error, { id: string; data: ApprovalData }>({
    mutationFn: async ({ id, data }: { id: string; data: ApprovalData }) => {
      return apiClient.patch<CustomerApplication>(`/applications/${id}/approve`, data);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      toast.success('បានអនុម័តពាក្យសុំដោយជោគជ័យ');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'មានបញ្ហាក្នុងការអនុម័តពាក្យសុំ');
    },
  });
};

// Reject application
export const useRejectApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation<CustomerApplication, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiClient.patch<CustomerApplication>(`/applications/${id}/reject`, { rejection_reason: reason });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      toast.success('បានបដិសេធពាក្យសុំដោយជោគជ័យ');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'មានបញ្ហាក្នុងការបដិសេធពាក្យសុំ');
    },
  });
};

// Delete application
export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({  // Added explicit type parameters
    mutationFn: async (id: string) => {
      return apiClient.delete<void>(`/applications/${id}`);  // Added generic type parameter
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('បានលុបពាក្យសុំដោយជោគជ័យ');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'មានបញ្ហាក្នុងការលុបពាក្យសុំ');
    },
  });
};

// Get application statistics
export const useApplicationStats = () => {
  return useQuery<any>({
    queryKey: ['application-stats'],
    queryFn: () => apiClient.get<any>('/applications/stats'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// Get workflow status for an application
export const useWorkflowStatus = (id: string) => {
  return useQuery<WorkflowStatusInfo>({
    queryKey: ['workflow-status', id],
    queryFn: () => apiClient.get<WorkflowStatusInfo>(`/applications/${id}/workflow/status`),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Get workflow history for an application
export const useWorkflowHistory = (id: string) => {
  return useQuery<WorkflowHistoryEntry[]>({
    queryKey: ['workflow-history', id],
    queryFn: () => apiClient.get<WorkflowHistoryEntry[]>(`/applications/${id}/workflow/history`),
    enabled: !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Perform workflow transition
export const useWorkflowTransition = () => {
  const queryClient = useQueryClient();
  
  return useMutation<CustomerApplication, Error, { id: string; data: WorkflowTransitionRequest }>({
    mutationFn: async ({ id, data }: { id: string; data: WorkflowTransitionRequest }) => {
      return apiClient.post<CustomerApplication>(`/applications/${id}/workflow/transition`, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['workflow-status', id] });
      queryClient.invalidateQueries({ queryKey: ['workflow-history', id] });
      toast.success('បានធ្វើការផ្លាស់ប្តូរស្ថានភាពដោយជោគជ័យ');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'មានបញ្ហាក្នុងការផ្លាស់ប្តូរស្ថានភាព');
    },
  });
};