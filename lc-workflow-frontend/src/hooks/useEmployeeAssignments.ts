import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { EmployeeAssignment, EmployeeAssignmentCreate, EmployeeAssignmentUpdate } from '@/types/models';
import toast from 'react-hot-toast';
import { isValidUUID, validateUUID } from '@/lib/utils';

// Assignment query keys
export const assignmentKeys = {
  all: ['employee-assignments'] as const,
  applicationAssignments: (applicationId: string) => ['application-assignments', applicationId] as const,
  employeeAssignments: (employeeId: string) => ['employee-assignments', employeeId] as const,
};

// Hook to get assignments for a specific application
export const useApplicationAssignments = (applicationId: string) => {
  // Check if user is authenticated before making API calls
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const isAuthenticated = !!token;

  return useQuery({
    queryKey: assignmentKeys.applicationAssignments(applicationId),
    queryFn: () => {
      return apiClient.get<EmployeeAssignment[]>(`/employees/assignments/application/${applicationId}`);
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: isAuthenticated && !!applicationId && isValidUUID(applicationId),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors - user needs to login
      if (error.response?.status === 401) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
  });
};

// Hook to get assignments for a specific employee
export const useEmployeeAssignments = (employeeId: string) => {
  // Check if user is authenticated before making API calls
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const isAuthenticated = !!token;

  return useQuery({
    queryKey: assignmentKeys.employeeAssignments(employeeId),
    queryFn: () => {
      return apiClient.get<EmployeeAssignment[]>(`/employees/assignments/employee/${employeeId}`);
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: isAuthenticated && !!employeeId && isValidUUID(employeeId),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors - user needs to login
      if (error.response?.status === 401) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
  });
};

// Hook to assign an employee to an application
export const useAssignEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { 
      application_id: string; 
      employee_id: string; 
      assignment_role: string; 
      notes?: string;
    }) => {
      validateUUID(data.application_id, 'Application');
      validateUUID(data.employee_id, 'Employee');
      return apiClient.post<EmployeeAssignment>('/employees/assignments', data);
    },
    onSuccess: (newAssignment, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: assignmentKeys.applicationAssignments(variables.application_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: assignmentKeys.employeeAssignments(variables.employee_id) 
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Employee assigned successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to assign employee';
      toast.error(message);
    },
  });
};

// Hook to update an assignment
export const useUpdateAssignment = (assignmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeAssignmentUpdate) => {
      validateUUID(assignmentId, 'Assignment');
      return apiClient.patch<EmployeeAssignment>(`/employees/assignments/${assignmentId}`, data);
    },
    onSuccess: (updatedAssignment) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: assignmentKeys.applicationAssignments(updatedAssignment.application_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: assignmentKeys.employeeAssignments(updatedAssignment.employee_id) 
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Assignment updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update assignment';
      toast.error(message);
    },
  });
};

// Hook to remove an assignment
export const useRemoveAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      assignmentId, 
      applicationId, 
      employeeId 
    }: { 
      assignmentId: string; 
      applicationId: string; 
      employeeId: string;
    }) => {
      validateUUID(assignmentId, 'Assignment');
      return apiClient.delete(`/employees/assignments/${assignmentId}`);
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: assignmentKeys.applicationAssignments(variables.applicationId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: assignmentKeys.employeeAssignments(variables.employeeId) 
      });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Assignment removed successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to remove assignment';
      toast.error(message);
    },
  });
};
