'use client';

import { useState, useEffect } from 'react';
import { X, Search, Calendar, Filter, Save, FolderOpen } from 'lucide-react';

interface SearchFilters {
  search: string;
  searchFields: string[];
  role: string;
  departmentId: string;
  branchId: string;
  status: string;
  createdFrom: string;
  createdTo: string;
  lastLoginFrom: string;
  lastLoginTo: string;
  activityLevel: string;
  inactiveDays: string;
  sortBy: string;
  sortOrder: string;
}

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  initialFilters: SearchFilters;
  departments: any[];
  branches: any[];
  savedSearches: any[];
  onSaveSearch: (name: string, filters: SearchFilters) => void;
  onLoadSearch: (search: any) => void;
}

const SEARCH_FIELDS = [
  { id: 'username', label: 'Username' },
  { id: 'email', label: 'Email' },
  { id: 'name', label: 'Name' },
  { id: 'employee_id', label: 'Employee ID' }
];

const ACTIVITY_LEVELS = [
  { id: '', label: 'All Activity Levels' },
  { id: 'active', label: 'Active (logged in last 30 days)' },
  { id: 'dormant', label: 'Dormant (90+ days inactive)' },
  { id: 'never_logged_in', label: 'Never Logged In' }
];

const SORT_OPTIONS = [
  { id: 'created_at', label: 'Created Date' },
  { id: 'last_login_at', label: 'Last Login' },
  { id: 'username', label: 'Username' },
  { id: 'email', label: 'Email' }
];

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  onSearch,
  initialFilters,
  departments,
  branches,
  savedSearches,
  onSaveSearch,
  onLoadSearch
}: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleFieldChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearchFieldToggle = (fieldId: string) => {
    setFilters(prev => ({
      ...prev,
      searchFields: prev.searchFields.includes(fieldId)
        ? prev.searchFields.filter(f => f !== fieldId)
        : [...prev.searchFields, fieldId]
    }));
  };

  const handleSearch = () => {
    onSearch(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
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
    };
    setFilters(resetFilters);
  };

  const handleSaveSearch = () => {
    if (saveSearchName.trim()) {
      onSaveSearch(saveSearchName.trim(), filters);
      setSaveSearchName('');
      setShowSaveForm(false);
    }
  };

  const hasActiveFilters = () => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return false;
      if (Array.isArray(value)) return value.length > 0;
      return value !== '';
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Search className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Advanced Search</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Saved Searches</h3>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map((search, index) => (
                  <button
                    key={search.id || search.name || index}
                    onClick={() => onLoadSearch(search)}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                  >
                    <FolderOpen className="h-3 w-3 mr-1" />
                    {search.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Text
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFieldChange('search', e.target.value)}
                placeholder="Enter search terms..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {/* Search Fields */}
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Search in fields (leave empty for all fields):
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEARCH_FIELDS.map((field) => (
                    <label key={field.id} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={filters.searchFields.includes(field.id)}
                        onChange={() => handleSearchFieldToggle(field.id)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-600">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={filters.role}
                onChange={(e) => handleFieldChange('role', e.target.value)}
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
                value={filters.departmentId}
                onChange={(e) => handleFieldChange('departmentId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={filters.branchId}
                onChange={(e) => handleFieldChange('branchId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Date Range Filters */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Date Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Created Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.createdFrom}
                      onChange={(e) => handleFieldChange('createdFrom', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.createdTo}
                      onChange={(e) => handleFieldChange('createdTo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Last Login Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.lastLoginFrom}
                      onChange={(e) => handleFieldChange('lastLoginFrom', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.lastLoginTo}
                      onChange={(e) => handleFieldChange('lastLoginTo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Filters */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Activity Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Activity Level</label>
                <select
                  value={filters.activityLevel}
                  onChange={(e) => handleFieldChange('activityLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ACTIVITY_LEVELS.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Custom Inactive Days
                </label>
                <input
                  type="number"
                  value={filters.inactiveDays}
                  onChange={(e) => handleFieldChange('inactiveDays', e.target.value)}
                  placeholder="e.g., 60"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find users inactive for specific number of days
                </p>
              </div>
            </div>
          </div>

          {/* Sorting */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Sorting</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFieldChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Sort Order</label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFieldChange('sortOrder', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Search Form */}
          {showSaveForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Save This Search</h3>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="Enter search name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveForm(false);
                    setSaveSearchName('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {hasActiveFilters() && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear All Filters
              </button>
            )}
            {hasActiveFilters() && (
              <button
                onClick={() => setShowSaveForm(!showSaveForm)}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Search
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}