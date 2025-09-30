'use client';

import { useState, useEffect } from 'react';
import { useUsers, useDeleteUser } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { useBranches } from '@/hooks/useBranches';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { User } from '@/types/models';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
  Download,
  Upload,
  CheckSquare,
  Square,
  RotateCcw,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Command,
  Settings,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import StatusIndicator from '@/components/ui/StatusIndicator';
import { LazyAdvancedSearchModal } from '@/components/lazy/LazyComponents';
import FilterChips from '@/components/users/FilterChips';
import { usePagePerformance } from '@/hooks/usePerformance';
import { apiClient } from '@/lib/api';

// Keyboard shortcuts hook
function useKeyboardShortcuts({
  onAdvancedSearch,
  onNewUser,
  onExport,
  onImport,
  onClearFilters
}: {
  onAdvancedSearch: () => void;
  onNewUser: () => void;
  onExport: () => void;
  onImport: () => void;
  onClearFilters: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k': // Ctrl/Cmd + K for advanced search
            event.preventDefault();
            onAdvancedSearch();
            break;
          case 'n': // Ctrl/Cmd + N for new user
            event.preventDefault();
            onNewUser();
            break;
          case 'e': // Ctrl/Cmd + E for export
            event.preventDefault();
            onExport();
            break;
          case 'i': // Ctrl/Cmd + I for import
            event.preventDefault();
            onImport();
            break;
          case 'r': // Ctrl/Cmd + R for clear filters
            event.preventDefault();
            onClearFilters();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onAdvancedSearch, onNewUser, onExport, onImport, onClearFilters]);
}

export default function UsersPage() {
  // Track page performance
  usePagePerformance('users');
  
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Enhanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    search: '',
    searchFields: [] as string[],
    role: '',
    departmentId: '',
    branchId: '',
    status: '',
    createdFrom: '',
    createdTo: '',
    lastLoginFrom: '',
    lastLoginTo: '',
    activityLevel: '',
    inactiveDays: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  
  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState('create_and_update');
  const [previewOnly, setPreviewOnly] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onAdvancedSearch: () => setShowAdvancedSearch(true),
    onNewUser: () => router.push('/users/new'),
    onExport: () => exportUsers(),
    onImport: () => setShowImportModal(true),
    onClearFilters: () => handleClearAllFilters()
  });

  // Saved searches
  const { savedSearches, saveSearch, deleteSearch } = useSavedSearches();

  const { data: usersData, isLoading, error } = useUsers({
    page,
    size: 10,
    search: searchFilters.search || search || undefined,
    role: searchFilters.role || roleFilter || undefined,
    department_id: searchFilters.departmentId || departmentFilter || undefined,
    branch_id: searchFilters.branchId || branchFilter || undefined,
    status: searchFilters.status || undefined,
    // Enhanced search parameters
    created_from: searchFilters.createdFrom || undefined,
    created_to: searchFilters.createdTo || undefined,
    last_login_from: searchFilters.lastLoginFrom || undefined,
    last_login_to: searchFilters.lastLoginTo || undefined,
    activity_level: searchFilters.activityLevel || undefined,
    inactive_days: searchFilters.inactiveDays ? parseInt(searchFilters.inactiveDays) : undefined,
    search_fields: searchFilters.searchFields.length > 0 ? searchFilters.searchFields.join(',') : undefined,
    sort_by: searchFilters.sortBy || undefined,
    sort_order: searchFilters.sortOrder || undefined,
  });

  const { data: departmentsData } = useDepartments({ size: 100 });
  const { data: branchesData } = useBranches({ size: 100 });
  const deleteUser = useDeleteUser();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser.mutateAsync(id);
        // Force refresh the users list
        window.location.reload();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setDepartmentFilter('');
    setBranchFilter('');
    setPage(1);
  };

  // Enhanced search handlers
  const handleAdvancedSearch = (filters: any) => {
    setSearchFilters(filters);
    setPage(1);
  };

  const getActiveFilterChips = () => {
    const chips = [];
    
    if (searchFilters.search) {
      chips.push({
        id: 'search',
        label: 'Search',
        value: searchFilters.search,
        displayValue: searchFilters.searchFields.length > 0 
          ? `"${searchFilters.search}" in ${searchFilters.searchFields.join(', ')}`
          : `"${searchFilters.search}"`
      });
    }
    
    if (searchFilters.role) {
      chips.push({
        id: 'role',
        label: 'Role',
        value: searchFilters.role,
        displayValue: searchFilters.role.charAt(0).toUpperCase() + searchFilters.role.slice(1)
      });
    }
    
    if (searchFilters.departmentId) {
      const dept = departmentsData?.items?.find(d => d.id === searchFilters.departmentId);
      chips.push({
        id: 'departmentId',
        label: 'Department',
        value: searchFilters.departmentId,
        displayValue: dept?.name || 'Unknown'
      });
    }
    
    if (searchFilters.branchId) {
      const branch = branchesData?.items?.find(b => b.id === searchFilters.branchId);
      chips.push({
        id: 'branchId',
        label: 'Branch',
        value: searchFilters.branchId,
        displayValue: branch?.name || 'Unknown'
      });
    }
    
    if (searchFilters.status) {
      chips.push({
        id: 'status',
        label: 'Status',
        value: searchFilters.status,
        displayValue: searchFilters.status.charAt(0).toUpperCase() + searchFilters.status.slice(1)
      });
    }
    
    if (searchFilters.activityLevel) {
      const activityLabels = {
        'active': 'Active (last 30 days)',
        'dormant': 'Dormant (90+ days)',
        'never_logged_in': 'Never logged in'
      };
      chips.push({
        id: 'activityLevel',
        label: 'Activity',
        value: searchFilters.activityLevel,
        displayValue: activityLabels[searchFilters.activityLevel as keyof typeof activityLabels] || searchFilters.activityLevel
      });
    }
    
    if (searchFilters.inactiveDays) {
      chips.push({
        id: 'inactiveDays',
        label: 'Inactive Days',
        value: searchFilters.inactiveDays,
        displayValue: `${searchFilters.inactiveDays} days`
      });
    }
    
    if (searchFilters.createdFrom || searchFilters.createdTo) {
      const dateRange = [searchFilters.createdFrom, searchFilters.createdTo]
        .filter(Boolean)
        .map(date => new Date(date).toLocaleDateString())
        .join(' to ');
      chips.push({
        id: 'createdDate',
        label: 'Created',
        value: `${searchFilters.createdFrom}-${searchFilters.createdTo}`,
        displayValue: dateRange
      });
    }
    
    if (searchFilters.lastLoginFrom || searchFilters.lastLoginTo) {
      const dateRange = [searchFilters.lastLoginFrom, searchFilters.lastLoginTo]
        .filter(Boolean)
        .map(date => new Date(date).toLocaleDateString())
        .join(' to ');
      chips.push({
        id: 'lastLoginDate',
        label: 'Last Login',
        value: `${searchFilters.lastLoginFrom}-${searchFilters.lastLoginTo}`,
        displayValue: dateRange
      });
    }
    
    return chips;
  };

  const handleRemoveFilter = (filterId: string) => {
    const newFilters = { ...searchFilters };
    
    switch (filterId) {
      case 'search':
        newFilters.search = '';
        newFilters.searchFields = [];
        break;
      case 'role':
        newFilters.role = '';
        break;
      case 'departmentId':
        newFilters.departmentId = '';
        break;
      case 'branchId':
        newFilters.branchId = '';
        break;
      case 'status':
        newFilters.status = '';
        break;
      case 'activityLevel':
        newFilters.activityLevel = '';
        break;
      case 'inactiveDays':
        newFilters.inactiveDays = '';
        break;
      case 'createdDate':
        newFilters.createdFrom = '';
        newFilters.createdTo = '';
        break;
      case 'lastLoginDate':
        newFilters.lastLoginFrom = '';
        newFilters.lastLoginTo = '';
        break;
    }
    
    setSearchFilters(newFilters);
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setSearchFilters({
      search: '',
      searchFields: [],
      role: '',
      departmentId: '',
      branchId: '',
      status: '',
      createdFrom: '',
      createdTo: '',
      lastLoginFrom: '',
      lastLoginTo: '',
      activityLevel: '',
      inactiveDays: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    setPage(1);
  };

  const handleLoadSavedSearch = (savedSearch: any) => {
    setSearchFilters(savedSearch.filters);
    setPage(1);
    setShowAdvancedSearch(false);
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedUsers.length === usersData?.items?.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usersData?.items?.map((user: User) => user.id) || []);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || !bulkReason.trim() || selectedUsers.length === 0) {
      alert('Please select users, status, and provide a reason');
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await apiClient.post('/users/bulk/status', {
        user_ids: selectedUsers,
        status: bulkStatus,
        reason: bulkReason
      });

      const result = response as any; // Type assertion for response data
      alert(`Successfully updated ${result.successful_updates || selectedUsers.length} users`);
      
      // Reset selection and refresh data
      setSelectedUsers([]);
      setShowBulkActions(false);
      setBulkStatus('');
      setBulkReason('');
      window.location.reload();
    } catch (error: any) {
      console.error('Bulk update failed:', error);
      alert(`Bulk update failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // CSV Import handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      setImportFile(file);
      setImportResults(null);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      alert('Please select a CSV file');
      return;
    }

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('import_mode', importMode);
      formData.append('preview_only', previewOnly.toString());

      const response = await fetch('/api/v1/users/import/csv', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Import failed');
      }

      const result = await response.json();
      setImportResults(result);

      if (!previewOnly && result.status === 'completed') {
        alert(`Import completed successfully! ${result.successful_imports} users processed.`);
        // Refresh the users list
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/v1/users/export/csv/template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'user_import_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const exportUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (departmentFilter) params.append('department_id', departmentFilter);
      if (branchFilter) params.append('branch_id', branchFilter);
      
      // Create download link
      const url = `/api/v1/users/export/csv?${params.toString()}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Users</h1>
              <p className="text-gray-600">Please try again later.</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
                <p className="text-gray-600">Manage system users and their permissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <button className="inline-flex items-center px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  <Command className="h-4 w-4 mr-1" />
                  Shortcuts
                </button>
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="p-3">
                    <h4 className="font-medium text-gray-900 mb-2">Keyboard Shortcuts</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Advanced Search</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+K</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New User</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+N</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Export CSV</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+E</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Import CSV</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+I</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clear Filters</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+R</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={exportUsers}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Upload className="h-5 w-5 mr-2" />
                Import CSV
              </button>
              <Link
                href="/users/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add User
              </Link>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-blue-800 font-medium">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Bulk Status Update
                </button>
              </div>
            </div>
            
            {showBulkActions && (
              <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Status Update</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Status
                    </label>
                    <select
                      value={bulkStatus}
                      onChange={(e) => setBulkStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select status...</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <input
                      type="text"
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                      placeholder="Enter reason for status change..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowBulkActions(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkStatusUpdate}
                    disabled={bulkActionLoading || !bulkStatus || !bulkReason.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bulkActionLoading ? 'Updating...' : `Update ${selectedUsers.length} Users`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Chips */}
        <FilterChips
          filters={getActiveFilterChips()}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or username..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-5 w-5 mr-2" />
                Advanced Search
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="officer">Officer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Departments</option>
                    {departmentsData?.items?.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Branches</option>
                    {branchesData?.items?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              {(search || roleFilter || departmentFilter || branchFilter) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Clear Filters
                </button>
              )}            </div>
          </form>
        </div>

        {/* Advanced Search Modal */}
        <LazyAdvancedSearchModal
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onSearch={handleAdvancedSearch}
          initialFilters={searchFilters}
          departments={departmentsData?.items || []}
          branches={branchesData?.items || []}
          savedSearches={savedSearches}
          onSaveSearch={saveSearch}
          onLoadSearch={handleLoadSavedSearch}
        />

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : usersData?.items?.length === 0 ? (
            <div className="p-8 text-center">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or add a new user.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center justify-center w-5 h-5 text-blue-600 hover:text-blue-800"
                        >
                          {selectedUsers.length === usersData?.items?.length && usersData?.items?.length > 0 ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Portfolio Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Line Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersData?.items?.map((user: User) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleSelectUser(user.id)}
                            className="flex items-center justify-center w-5 h-5 text-blue-600 hover:text-blue-800"
                          >
                            {selectedUsers.includes(user.id) ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              <div className="text-xs text-gray-400">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.department_id ? (
                            departmentsData?.items?.find(d => d.id === user.department_id)?.name || 'Unknown'
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.portfolio ? (
                            <div>
                              <span className="text-blue-600">
                                {user.portfolio.first_name} {user.portfolio.last_name}
                              </span>
                              {user.portfolio.branch_id !== user.branch_id && (
                                <div className="text-xs text-orange-500">Different branch</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.line_manager ? (
                            <div>
                              <span className="text-green-600">
                                {user.line_manager.first_name} {user.line_manager.last_name}
                              </span>
                              {user.line_manager.branch_id !== user.branch_id && (
                                <div className="text-xs text-orange-500">Different branch</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusIndicator status={user.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login_at 
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => router.push(`/users/${user.id}/lifecycle`)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Lifecycle Management"
                            >
                              <Calendar className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/users/${user.id}`)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/users/${user.id}/edit`)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={deleteUser.isPending}
                              className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersData && usersData.pages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(usersData.pages, page + 1))}
                        disabled={page === usersData.pages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{(page - 1) * 10 + 1}</span>
                          {' '}to{' '}
                          <span className="font-medium">
                            {Math.min(page * 10, usersData.total)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{usersData.total}</span>
                          {' '}results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            {page} of {usersData.pages}
                          </span>
                          <button
                            onClick={() => setPage(Math.min(usersData.pages, page + 1))}
                            disabled={page === usersData.pages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* CSV Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Import Users from CSV</h2>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportResults(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {!importResults ? (
                <>
                  {/* Template Download */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-blue-800">Need a template?</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Download our CSV template to ensure your data is formatted correctly.
                        </p>
                        <button
                          onClick={downloadTemplate}
                          className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download Template
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select CSV File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {importFile ? importFile.name : 'Click to select CSV file or drag and drop'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          CSV files only, max 10MB
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Import Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Import Mode
                      </label>
                      <select
                        value={importMode}
                        onChange={(e) => setImportMode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="create_and_update">Create new and update existing</option>
                        <option value="create_only">Create new users only</option>
                        <option value="update_only">Update existing users only</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="preview-only"
                        checked={previewOnly}
                        onChange={(e) => setPreviewOnly(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="preview-only" className="ml-2 text-sm text-gray-700">
                        Preview only (don't import)
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportFile(null);
                        setImportResults(null);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportCSV}
                      disabled={!importFile || importLoading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {importLoading ? 'Processing...' : (previewOnly ? 'Preview Import' : 'Import Users')}
                    </button>
                  </div>
                </>
              ) : (
                /* Import Results */
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Import Results</h3>
                    
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{importResults.successful_imports}</div>
                        <div className="text-sm text-green-700">Successful</div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">{importResults.failed_imports}</div>
                        <div className="text-sm text-red-700">Failed</div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{importResults.skipped_rows}</div>
                        <div className="text-sm text-yellow-700">Skipped</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{importResults.total_rows}</div>
                        <div className="text-sm text-blue-700">Total</div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mb-4">
                      {importResults.status === 'completed' ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            {importResults.preview_mode ? 'Preview completed successfully' : 'Import completed successfully'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-yellow-600">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium">Import completed with some issues</span>
                        </div>
                      )}
                    </div>

                    {/* Detailed Results */}
                    {importResults.results && importResults.results.length > 0 && (
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {importResults.results.map((result: any, index: number) => (
                              <tr key={result.row_number || index} className={result.action === 'failed' ? 'bg-red-50' : ''}>
                                <td className="px-4 py-2 text-sm text-gray-900">{result.row_number}</td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    result.action === 'created' ? 'bg-green-100 text-green-800' :
                                    result.action === 'updated' ? 'bg-blue-100 text-blue-800' :
                                    result.action === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {result.action}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">{result.email}</td>
                                <td className="px-4 py-2 text-sm">
                                  {result.errors.length > 0 && (
                                    <div className="text-red-600">
                                      {result.errors.join(', ')}
                                    </div>
                                  )}
                                  {result.warnings.length > 0 && (
                                    <div className="text-yellow-600">
                                      {result.warnings.join(', ')}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-3">
                    {importResults.preview_mode && importResults.status === 'completed' && (
                      <button
                        onClick={() => {
                          setPreviewOnly(false);
                          setImportResults(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Proceed with Import
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportFile(null);
                        setImportResults(null);
                        setPreviewOnly(false);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}