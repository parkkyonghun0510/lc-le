"use client";

import React, { useState } from 'react';
import PermissionTable from './PermissionTable';
import { usePermissions, useUpdatePermission, useDeletePermission } from '@/hooks/usePermissions';
import type { Permission } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';

/**
 * Example usage of PermissionTable component
 * This demonstrates how to integrate the table with the permission hooks
 */
export default function PermissionTableExample() {
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    resourceType: '',
    action: '',
    scope: '',
    isActive: null as boolean | null
  });
  const [page, setPage] = useState(1);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch permissions with filters
  const { data: permissions = [], isLoading, error, refetch } = usePermissions({
    resource_type: filters.resourceType || undefined,
    action: filters.action || undefined,
    scope: filters.scope || undefined,
    is_active: filters.isActive ?? undefined,
    skip: (page - 1) * 50,
    limit: 50
  });

  // Mutations
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  // Filter permissions by search term (client-side)
  const filteredPermissions = permissions.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle selection
  const handleSelectAll = () => {
    if (selectedPermissions.length === filteredPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(filteredPermissions.map(p => p.id));
    }
  };

  const handleSelectPermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Handle actions
  const handleEdit = (permission: Permission) => {
    // Navigate to edit page or open modal
    console.log('Edit permission:', permission);
    toast(`Edit functionality for "${permission.name}" would be implemented here`);
  };

  const handleDelete = async (permissionId: string) => {
    try {
      await deletePermission.mutateAsync(permissionId);
      toast.success('Permission deleted successfully');
      setSelectedPermissions(prev => prev.filter(id => id !== permissionId));
    } catch (error) {
      toast.error('Failed to delete permission');
    }
  };

  const handleToggleActive = async (permissionId: string, isActive: boolean) => {
    try {
      await updatePermission.mutateAsync({
        id: permissionId,
        is_active: isActive
      });
      toast.success(`Permission ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to update permission status');
    }
  };

  // Handle bulk actions
  const handleBulkActivate = async (permissionIds: string[]) => {
    try {
      await Promise.all(
        permissionIds.map(id =>
          updatePermission.mutateAsync({ id, is_active: true })
        )
      );
      toast.success(`${permissionIds.length} permission(s) activated successfully`);
      setSelectedPermissions([]);
    } catch (error) {
      toast.error('Failed to activate permissions');
    }
  };

  const handleBulkDeactivate = async (permissionIds: string[]) => {
    try {
      await Promise.all(
        permissionIds.map(id =>
          updatePermission.mutateAsync({ id, is_active: false })
        )
      );
      toast.success(`${permissionIds.length} permission(s) deactivated successfully`);
      setSelectedPermissions([]);
    } catch (error) {
      toast.error('Failed to deactivate permissions');
    }
  };

  const handleBulkDelete = async (permissionIds: string[]) => {
    try {
      await Promise.all(
        permissionIds.map(id => deletePermission.mutateAsync(id))
      );
      toast.success(`${permissionIds.length} permission(s) deleted successfully`);
      setSelectedPermissions([]);
    } catch (error) {
      toast.error('Failed to delete permissions');
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  // Calculate pagination
  const totalItems = filteredPermissions.length;
  const itemsPerPage = 50;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage system permissions and access controls
        </p>
      </div>

      <PermissionTable
        permissions={filteredPermissions}
        loading={isLoading}
        error={error?.message || null}
        pagination={{
          page,
          totalPages,
          totalItems,
          itemsPerPage,
          onPageChange: setPage
        }}
        selectedPermissions={selectedPermissions}
        onSelectAll={handleSelectAll}
        onSelectPermission={handleSelectPermission}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
        onBulkDelete={handleBulkDelete}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}
