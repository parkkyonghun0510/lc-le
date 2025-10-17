"use client";

import React, { useState, useMemo } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import PermissionTable from './PermissionTable';
import PermissionFormModal from './PermissionFormModal';
import DeletePermissionDialog from './DeletePermissionDialog';
import { PermissionFormData } from './PermissionForm';
import {
  usePermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
  Permission,
} from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';

export default function PermissionManagement() {
  // State for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  // State for table
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    resourceType: '',
    action: '',
    scope: '',
    isActive: null as boolean | null,
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch permissions
  const { data: allPermissions = [], isLoading, error } = usePermissions({
    is_active: filters.isActive ?? undefined,
    resource_type: filters.resourceType || undefined,
    action: filters.action || undefined,
    scope: filters.scope || undefined,
  });

  // Mutations
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  // Filter and paginate permissions
  const filteredPermissions = useMemo(() => {
    let filtered = [...allPermissions];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [allPermissions, searchTerm]);

  const paginatedPermissions = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPermissions.slice(startIndex, endIndex);
  }, [filteredPermissions, page, itemsPerPage]);

  const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage);

  // Handlers
  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (permissionId: string) => {
    const permission = allPermissions.find((p) => p.id === permissionId);
    if (permission) {
      setSelectedPermission(permission);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleToggleActive = async (permissionId: string, isActive: boolean) => {
    try {
      await updatePermission.mutateAsync({
        id: permissionId,
        is_active: isActive,
      });
      toast.success(`Permission ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permission status');
    }
  };

  const handleCreateSubmit = async (data: PermissionFormData) => {
    try {
      // Parse conditions if provided
      let conditions = undefined;
      if (data.conditions && data.conditions.trim()) {
        try {
          conditions = JSON.parse(data.conditions);
        } catch {
          toast.error('Invalid JSON in conditions field');
          return;
        }
      }

      await createPermission.mutateAsync({
        name: data.name,
        description: data.description,
        resource_type: data.resource_type,
        action: data.action,
        scope: data.scope,
        conditions,
      });

      toast.success('Permission created successfully');
      setIsCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create permission');
      throw error;
    }
  };

  const handleEditSubmit = async (data: PermissionFormData) => {
    if (!selectedPermission) return;

    try {
      // Parse conditions if provided
      let conditions = undefined;
      if (data.conditions && data.conditions.trim()) {
        try {
          conditions = JSON.parse(data.conditions);
        } catch {
          toast.error('Invalid JSON in conditions field');
          return;
        }
      }

      await updatePermission.mutateAsync({
        id: selectedPermission.id,
        description: data.description,
        is_active: data.is_active,
        conditions,
      });

      toast.success('Permission updated successfully');
      setIsEditModalOpen(false);
      setSelectedPermission(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permission');
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPermission) return;

    try {
      await deletePermission.mutateAsync(selectedPermission.id);
      toast.success('Permission deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedPermission(null);
      setSelectedPermissions((prev) =>
        prev.filter((id) => id !== selectedPermission.id)
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete permission');
    }
  };

  const handleSelectAll = () => {
    if (selectedPermissions.length === paginatedPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(paginatedPermissions.map((p) => p.id));
    }
  };

  const handleSelectPermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleBulkActivate = async (permissionIds: string[]) => {
    try {
      await Promise.all(
        permissionIds.map((id) =>
          updatePermission.mutateAsync({ id, is_active: true })
        )
      );
      toast.success(`${permissionIds.length} permission(s) activated successfully`);
      setSelectedPermissions([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate permissions');
    }
  };

  const handleBulkDeactivate = async (permissionIds: string[]) => {
    try {
      await Promise.all(
        permissionIds.map((id) =>
          updatePermission.mutateAsync({ id, is_active: false })
        )
      );
      toast.success(`${permissionIds.length} permission(s) deactivated successfully`);
      setSelectedPermissions([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate permissions');
    }
  };

  const handleBulkDelete = async (permissionIds: string[]) => {
    try {
      await Promise.all(
        permissionIds.map((id) => deletePermission.mutateAsync(id))
      );
      toast.success(`${permissionIds.length} permission(s) deleted successfully`);
      setSelectedPermissions([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete permissions');
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage individual permissions that can be assigned to roles
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Permission
        </button>
      </div>

      {/* Permission Table */}
      <PermissionTable
        permissions={paginatedPermissions}
        loading={isLoading}
        error={error?.message || null}
        pagination={{
          page,
          totalPages,
          totalItems: filteredPermissions.length,
          itemsPerPage,
          onPageChange: setPage,
        }}
        selectedPermissions={selectedPermissions}
        onSelectAll={handleSelectAll}
        onSelectPermission={handleSelectPermission}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onToggleActive={handleToggleActive}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
        onBulkDelete={handleBulkDelete}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Create Modal */}
      <PermissionFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        loading={createPermission.isPending}
      />

      {/* Edit Modal */}
      <PermissionFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPermission(null);
        }}
        permission={selectedPermission || undefined}
        onSubmit={handleEditSubmit}
        loading={updatePermission.isPending}
      />

      {/* Delete Dialog */}
      <DeletePermissionDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedPermission(null);
        }}
        onConfirm={handleDeleteConfirm}
        permission={selectedPermission}
        loading={deletePermission.isPending}
      />
    </div>
  );
}
