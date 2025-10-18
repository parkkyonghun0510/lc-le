# Integration Example: Using Task 9 Optimizations

This document provides practical examples of how to integrate the performance and mobile optimizations into the existing permission management system.

## Example 1: Optimized Permission List with Virtualization

```typescript
'use client';

import React, { useState } from 'react';
import { useOptimizedPermissions } from '@/hooks/useOptimizedPermissions';
import VirtualizedList from '@/components/permissions/VirtualizedList';
import EnhancedPagination from '@/components/permissions/EnhancedPagination';
import { TableSkeleton } from '@/components/permissions/SkeletonLoaders';
import AdvancedSearch from '@/components/permissions/AdvancedSearch';
import { exportToCSV } from '@/utils/exportUtils';

export default function OptimizedPermissionList() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data: permissions = [], isLoading } = useOptimizedPermissions(filters);

  const handleSearch = (searchFilters) => {
    setFilters(searchFilters);
    setPage(1);
  };

  const handleExport = () => {
    exportToCSV(
      permissions,
      [
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
        { key: 'resource_type', label: 'Resource Type' },
        { key: 'action', label: 'Action' },
        { key: 'scope', label: 'Scope' },
      ],
      'permissions.csv'
    );
  };

  if (isLoading) {
    return <TableSkeleton rows={10} columns={5} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Permissions</h2>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Export CSV
        </button>
      </div>

      <AdvancedSearch
        onSearch={handleSearch}
        searchFields={[
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'resource_type', label: 'Resource Type', type: 'text' },
          { key: 'action', label: 'Action', type: 'text' },
        ]}
      />

      <VirtualizedList
        items={permissions}
        itemHeight={80}
        containerHeight={600}
        renderItem={(permission) => (
          <div className="p-4 border-b hover:bg-gray-50">
            <h3 className="font-medium">{permission.name}</h3>
            <p className="text-sm text-gray-600">{permission.description}</p>
          </div>
        )}
      />

      <EnhancedPagination
        currentPage={page}
        totalPages={Math.ceil(permissions.length / pageSize)}
        totalItems={permissions.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        showPageSizeSelector
        showJumpToPage
      />
    </div>
  );
}
```

## Example 2: Responsive Permission Matrix

```typescript
'use client';

import React from 'react';
import { useOptimizedMatrix } from '@/hooks/useOptimizedPermissions';
import ResponsivePermissionWrapper from '@/components/permissions/ResponsivePermissionWrapper';
import MobilePermissionMatrix from '@/components/permissions/MobilePermissionMatrix';
import PermissionMatrix from '@/components/permissions/PermissionMatrix';
import { MatrixSkeleton } from '@/components/permissions/SkeletonLoaders';
import { exportMatrixToCSV } from '@/utils/exportUtils';

export default function ResponsiveMatrixView() {
  const { data: matrixData, isLoading } = useOptimizedMatrix();

  const handleTogglePermission = async (roleId: string, permissionId: string) => {
    // Toggle logic here
  };

  const handleExport = () => {
    if (matrixData) {
      exportMatrixToCSV(
        matrixData.roles,
        matrixData.permissions,
        matrixData.assignments,
        'permission-matrix.csv'
      );
    }
  };

  if (isLoading) {
    return <MatrixSkeleton rows={8} cols={10} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Permission Matrix</h2>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Export Matrix
        </button>
      </div>

      <ResponsivePermissionWrapper
        mobileComponent={MobilePermissionMatrix}
        desktopComponent={PermissionMatrix}
        componentProps={{
          roles: matrixData?.roles || [],
          permissions: matrixData?.permissions || [],
          assignments: matrixData?.assignments || {},
          onTogglePermission: handleTogglePermission,
        }}
        loadingComponent={<MatrixSkeleton />}
      />
    </div>
  );
}
```

## Example 3: Mobile-Optimized Form

```typescript
'use client';

import React, { useState } from 'react';
import ResponsiveFormLayout, {
  FormField,
  FormSection,
  MobileInput,
  MobileSelect,
  MobileTextarea,
  MobileCheckbox,
  MobileActionButton,
} from '@/components/permissions/ResponsiveFormLayout';
import { ResponsiveModal } from '@/components/permissions/ResponsivePermissionWrapper';

export default function CreatePermissionForm({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    resource_type: '',
    action: '',
    scope: '',
    is_active: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Submit logic here
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Permission"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <ResponsiveFormLayout
          actions={
            <>
              <MobileActionButton
                variant="secondary"
                onClick={onClose}
                type="button"
              >
                Cancel
              </MobileActionButton>
              <MobileActionButton variant="primary" type="submit">
                Create Permission
              </MobileActionButton>
            </>
          }
          stickyActions
        >
          <FormSection title="Basic Information" description="Core permission details">
            <FormField label="Permission Name" required>
              <MobileInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., user:create"
              />
            </FormField>

            <FormField label="Description" required>
              <MobileTextarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this permission allows"
                rows={3}
              />
            </FormField>
          </FormSection>

          <FormSection title="Permission Settings" description="Configure permission scope">
            <FormField label="Resource Type" required>
              <MobileSelect
                value={formData.resource_type}
                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
              >
                <option value="">Select resource type</option>
                <option value="USER">User</option>
                <option value="APPLICATION">Application</option>
                <option value="DEPARTMENT">Department</option>
              </MobileSelect>
            </FormField>

            <FormField label="Action" required>
              <MobileSelect
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              >
                <option value="">Select action</option>
                <option value="CREATE">Create</option>
                <option value="READ">Read</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </MobileSelect>
            </FormField>

            <FormField label="Scope" required>
              <MobileSelect
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              >
                <option value="">Select scope</option>
                <option value="OWN">Own</option>
                <option value="DEPARTMENT">Department</option>
                <option value="BRANCH">Branch</option>
                <option value="GLOBAL">Global</option>
              </MobileSelect>
            </FormField>

            <MobileCheckbox
              label="Active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
          </FormSection>
        </ResponsiveFormLayout>
      </form>
    </ResponsiveModal>
  );
}
```

## Example 4: Mobile Navigation Integration

```typescript
'use client';

import React, { useState } from 'react';
import MobileNavigation from '@/components/permissions/MobileNavigation';
import { ResponsiveContainer } from '@/components/permissions/ResponsivePermissionWrapper';
import { useIsMobile } from '@/hooks/useMediaQuery';

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState('matrix');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isMobile = useIsMobile();

  const renderContent = () => {
    switch (activeTab) {
      case 'matrix':
        return <PermissionMatrixView />;
      case 'roles':
        return <RoleManagementView />;
      case 'users':
        return <UserPermissionView />;
      case 'permissions':
        return <PermissionManagementView />;
      case 'templates':
        return <TemplateManagementView />;
      default:
        return null;
    }
  };

  return (
    <>
      <ResponsiveContainer hasMobileNav={isMobile}>
        <div className="p-4 md:p-6">
          {renderContent()}
        </div>
      </ResponsiveContainer>

      {isMobile && (
        <MobileNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onActionClick={() => setShowCreateModal(true)}
          actionLabel="Create"
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreatePermissionForm
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
```

## Example 5: Prefetching for Better UX

```typescript
'use client';

import React, { useEffect } from 'react';
import { usePrefetchPermissionData } from '@/hooks/useOptimizedPermissions';
import { useRouter } from 'next/navigation';

export default function PermissionsDashboard() {
  const router = useRouter();
  const { prefetchPermissions, prefetchRoles, prefetchMatrix } = usePrefetchPermissionData();

  // Prefetch data on mount
  useEffect(() => {
    prefetchPermissions();
    prefetchRoles();
    prefetchMatrix();
  }, []);

  // Prefetch on hover
  const handleMouseEnter = (section: string) => {
    switch (section) {
      case 'permissions':
        prefetchPermissions();
        break;
      case 'roles':
        prefetchRoles();
        break;
      case 'matrix':
        prefetchMatrix();
        break;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        onMouseEnter={() => handleMouseEnter('permissions')}
        onClick={() => router.push('/permissions')}
        className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold">Permissions</h3>
        <p className="text-gray-600">Manage system permissions</p>
      </button>

      <button
        onMouseEnter={() => handleMouseEnter('roles')}
        onClick={() => router.push('/permissions?tab=roles')}
        className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold">Roles</h3>
        <p className="text-gray-600">Manage user roles</p>
      </button>

      <button
        onMouseEnter={() => handleMouseEnter('matrix')}
        onClick={() => router.push('/permissions?tab=matrix')}
        className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold">Matrix</h3>
        <p className="text-gray-600">View permission matrix</p>
      </button>
    </div>
  );
}
```

## Example 6: Export with Custom Formatting

```typescript
import {
  exportToCSV,
  exportAuditTrailToCSV,
  exportRolesWithPermissions,
  copyToClipboard,
  printTable,
} from '@/utils/exportUtils';

// Export permissions with custom formatting
const exportPermissionsCustom = (permissions) => {
  exportToCSV(
    permissions,
    [
      { key: 'name', label: 'Permission Name' },
      { key: 'description', label: 'Description' },
      { 
        key: 'resource_type', 
        label: 'Resource', 
        format: (value) => value.toLowerCase() 
      },
      { 
        key: 'created_at', 
        label: 'Created', 
        format: (value) => new Date(value).toLocaleDateString() 
      },
      {
        key: 'is_active',
        label: 'Status',
        format: (value) => value ? 'Active' : 'Inactive'
      },
    ],
    'permissions-report.csv'
  );
};

// Export audit trail
const exportAudit = (entries) => {
  exportAuditTrailToCSV(entries, 'audit-trail.csv');
};

// Copy to clipboard
const copyPermissions = async (permissions) => {
  try {
    await copyToClipboard(permissions, 'json');
    alert('Copied to clipboard!');
  } catch (err) {
    alert('Failed to copy');
  }
};

// Print table
const printPermissions = (permissions) => {
  printTable(
    permissions,
    [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'resource_type', label: 'Resource' },
    ],
    'Permission Report'
  );
};
```

## Best Practices

1. **Always use optimized hooks** instead of regular React Query hooks for better caching
2. **Implement virtualization** for lists with more than 50 items
3. **Use skeleton loaders** instead of spinners for better perceived performance
4. **Prefetch data** on hover or mount for instant navigation
5. **Use responsive components** to automatically adapt to screen size
6. **Implement proper loading states** with appropriate skeleton types
7. **Add export functionality** to all data views for better UX
8. **Use advanced search** for complex filtering requirements
9. **Test on actual mobile devices** to ensure touch interactions work properly
10. **Monitor performance** with React DevTools Profiler

## Performance Tips

1. Use `useOptimizedPermissions` with appropriate filters to reduce data transfer
2. Implement pagination with `EnhancedPagination` for large datasets
3. Use `VirtualizedList` for lists with 100+ items
4. Prefetch data before navigation for instant page loads
5. Use skeleton loaders to improve perceived performance
6. Debounce search inputs to reduce API calls
7. Cache aggressively with appropriate stale times
8. Use optimistic updates for instant feedback

## Mobile Tips

1. Always test on actual devices, not just browser DevTools
2. Use touch-friendly components from `ResponsiveFormLayout`
3. Implement bottom navigation for main sections
4. Use full-screen modals on mobile
5. Ensure all touch targets are at least 44x44px
6. Add safe area insets for notched devices
7. Test in both portrait and landscape orientations
8. Optimize for one-handed use with bottom navigation
