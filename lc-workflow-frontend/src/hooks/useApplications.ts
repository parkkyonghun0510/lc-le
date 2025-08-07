import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';

export interface Application {
  id: string;
  user_id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  
  // Borrower Information
  id_card_type?: string;
  id_number?: string;
  full_name_khmer?: string;
  full_name_latin?: string;
  phone?: string;
  date_of_birth?: string;
  portfolio_officer_name?: string;
  
  // Loan Details
  requested_amount?: number;
  loan_purposes?: string[];
  purpose_details?: string;
  product_type?: string;
  desired_loan_term?: string;
  requested_disbursement_date?: string;
  
  // Guarantor Information
  guarantor_name?: string;
  guarantor_phone?: string;
  
  // Additional data
  collaterals?: any[];
  documents?: any[];
  
  // Metadata
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
}

export interface ApplicationsResponse {
  items: Application[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApplicationFilters {
  search?: string;
  status?: string;
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
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.size) params.append('size', filters.size.toString());
      
      return apiClient.get<ApplicationsResponse>(`/applications?${params.toString()}`);  // Added generic type parameter
    },
    staleTime: 30000, // 30 seconds
  });
};

// Get single application
export const useApplication = (id: string) => {
  return useQuery<Application>({  // Explicit type parameter
    queryKey: ['application', id],
    queryFn: () => apiClient.get<Application>(`/applications/${id}`),  // Added generic type parameter
    enabled: !!id,
  });
};

// Create application
export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Application, Error, Partial<Application>>({  // Added explicit type parameters
    mutationFn: async (data: Partial<Application>) => {
      return apiClient.post<Application>('/applications', data);  // Added generic type parameter
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
  
  return useMutation<Application, Error, { id: string; data: Partial<Application> }>({  // Added explicit type parameters
    mutationFn: async ({ id, data }: { id: string; data: Partial<Application> }) => {
      return apiClient.put<Application>(`/applications/${id}`, data);  // Added generic type parameter
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
  
  return useMutation<Application, Error, string>({  // Added explicit type parameters
    mutationFn: async (id: string) => {
      return apiClient.patch<Application>(`/applications/${id}/submit`, {});  // Added generic type parameter
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
  
  return useMutation<Application, Error, string>({  // Added explicit type parameters
    mutationFn: async (id: string) => {
      return apiClient.patch<Application>(`/applications/${id}/approve`, {});  // Added generic type parameter
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
  
  return useMutation<Application, Error, { id: string; reason: string }>({  // Added explicit type parameters
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiClient.patch<Application>(`/applications/${id}/reject`, { rejection_reason: reason });  // Added generic type parameter
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
  return useQuery<any>({  // Added explicit type parameter, using 'any' as we don't know the exact type
    queryKey: ['application-stats'],
    queryFn: () => apiClient.get<any>('/applications/stats'),  // Added generic type parameter
    staleTime: 60000, // 1 minute
  });
};