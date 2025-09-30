import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Position, PositionCreate, PositionUpdate, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';
import { isValidUUID, validateUUID } from '@/lib/utils';

type PositionFilters = {
    page?: number;
    size?: number;
    search?: string;
    is_active?: boolean;
};

// Position query keys (mirrors pattern in other hooks)
export const positionKeys = {
    all: ['positions'] as const,
    lists: () => [...positionKeys.all, 'list'] as const,
    list: (filters: PositionFilters) => [...positionKeys.lists(), filters] as const,
    details: () => [...positionKeys.all, 'detail'] as const,
    detail: (id: string) => [...positionKeys.details(), id] as const,
};

// List positions with optional filters (search/pagination/is_active)
export const usePositions = (filters: PositionFilters = {}) => {
    // Check if user is authenticated before making API calls
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const isAuthenticated = !!token;


    return useQuery({
        queryKey: positionKeys.list(filters),
        queryFn: () => {
            return apiClient.get<PaginatedResponse<Position>>('/positions/', {
                params: filters,
            });
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: isAuthenticated, // Only run query if user is authenticated
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

// Get single position by id
export const usePosition = (id: string) => {
    return useQuery({
        queryKey: positionKeys.detail(id),
        queryFn: () => apiClient.get<Position>(`/positions/${id}`),
        staleTime: 5 * 60 * 1000,
        enabled: !!id && isValidUUID(id),
    });
};

// Create position
export const useCreatePosition = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PositionCreate) => apiClient.post<Position>('/positions/', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: positionKeys.lists() });
            toast.success('Position created successfully!');
        },
        onError: (error: unknown) => {
            // Align with project pattern without using 'any'
            const err = error as { response?: { data?: { detail?: string } } };
            const message = err.response?.data?.detail || 'Failed to create position';
            toast.error(message);
        },
    });
};

// Update position (mirror convention: other hooks use PATCH)
export const useUpdatePosition = (id: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PositionUpdate) => {
            validateUUID(id);
            return apiClient.patch<Position>(`/positions/${id}`, data);
        },
        onSuccess: (updated) => {
            queryClient.setQueryData(positionKeys.detail(id), updated);
            queryClient.invalidateQueries({ queryKey: positionKeys.lists() });
            toast.success('Position updated successfully!');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { detail?: string } } };
            const message = err.response?.data?.detail || 'Failed to update position';
            toast.error(message);
        },
    });
};

// Delete position
export const useDeletePosition = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => {
            validateUUID(id);
            return apiClient.delete(`/positions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: positionKeys.lists() });
            toast.success('Position deleted successfully!');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { detail?: string } } };
            const message = err.response?.data?.detail || 'Failed to delete position';
            toast.error(message);
        },
    });
};