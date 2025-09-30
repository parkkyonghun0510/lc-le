'use client';

import { ReactNode, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  RotateCcw
} from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  
  // Pagination
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
  
  // Sorting
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSort: (key: string) => void;
  };
  
  // Selection
  selection?: {
    selectedItems: string[];
    onSelectAll: () => void;
    onSelectItem: (id: string) => void;
    getItemId: (item: T) => string;
  };
  
  // Actions
  actions?: {
    onAdd?: () => void;
    onExport?: () => void;
    onImport?: () => void;
    onRefresh?: () => void;
    onClearFilters?: () => void;
  };
  
  // Search
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onSearch?: () => void;
  };
  
  // Filters
  filters?: {
    showFilters: boolean;
    onToggleFilters: () => void;
    children: ReactNode;
  };
  
  // View modes
  viewMode?: 'table' | 'cards' | 'list';
  onViewModeChange?: (mode: 'table' | 'cards' | 'list') => void;
  
  // Custom renderers
  cardRenderer?: (item: T, index: number) => ReactNode;
  listRenderer?: (item: T, index: number) => ReactNode;
  
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  error = null,
  emptyMessage = 'No data found',
  emptyIcon,
  pagination,
  sorting,
  selection,
  actions,
  search,
  filters,
  viewMode = 'table',
  onViewModeChange,
  cardRenderer,
  listRenderer,
  className = '',
  tableClassName = '',
  headerClassName = ''
}: DataTableProps<T>) {
  const [localSortBy, setLocalSortBy] = useState<string>('');
  const [localSortOrder, setLocalSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (!sorting) return;
    
    const newOrder = localSortBy === key && localSortOrder === 'asc' ? 'desc' : 'asc';
    setLocalSortBy(key);
    setLocalSortOrder(newOrder);
    sorting.onSort(key);
  };

  const getSortIcon = (key: string) => {
    if (localSortBy !== key) return null;
    return localSortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const renderEmptyState = () => (
    <div className="text-center py-12">
      {emptyIcon || (
        <div className="mx-auto h-12 w-12 text-gray-400">
          <Search className="h-full w-full" />
        </div>
      )}
      <h3 className="mt-2 text-sm font-medium text-gray-900">{emptyMessage}</h3>
      <p className="mt-1 text-sm text-gray-500">
        {search?.value ? 'Try adjusting your search criteria.' : 'Get started by adding some data.'}
      </p>
    </div>
  );

  const renderTableHeader = () => (
    <thead className="bg-gray-50">
      <tr>
        {selection && (
          <th className="px-6 py-3 text-left">
            <button
              onClick={selection.onSelectAll}
              className="flex items-center justify-center w-5 h-5 text-blue-600 hover:text-blue-800"
            >
              {selection.selectedItems.length === data.length && data.length > 0 ? (
                <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-blue-600 rounded"></div>
              )}
            </button>
          </th>
        )}
        {columns.map((column) => (
          <th
            key={column.key}
            className={`
              px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
              ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
              ${column.headerClassName || ''}
            `}
            onClick={column.sortable ? () => handleSort(column.key) : undefined}
          >
            <div className="flex items-center space-x-1">
              <span>{column.label}</span>
              {column.sortable && getSortIcon(column.key)}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );

  const renderTableBody = () => (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((item, index) => (
        <tr key={selection?.getItemId(item) || index} className="hover:bg-gray-50">
          {selection && (
            <td className="px-6 py-4 whitespace-nowrap">
              <button
                onClick={() => selection.onSelectItem(selection.getItemId(item))}
                className="flex items-center justify-center w-5 h-5 text-blue-600 hover:text-blue-800"
              >
                {selection.selectedItems.includes(selection.getItemId(item)) ? (
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : (
                  <div className="w-5 h-5 border-2 border-blue-600 rounded"></div>
                )}
              </button>
            </td>
          )}
          {columns.map((column) => (
            <td
              key={column.key}
              className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}
            >
              {column.render ? column.render(item, index) : (item as any)[column.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {((pagination.page - 1) * pagination.itemsPerPage) + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.itemsPerPage, pagination.totalItems)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalItems}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => pagination.onPageChange(page)}
                      className={`
                        relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${page === pagination.page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }
                      `}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-8 text-center">
          <div className="text-red-600 mb-2">Error loading data</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header with actions */}
      {(actions || search || filters) && (
        <div className={`px-6 py-4 border-b border-gray-200 ${headerClassName}`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {search && (
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={search.placeholder || 'Search...'}
                    value={search.value}
                    onChange={(e) => search.onChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && search.onSearch?.()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {filters && (
                <button
                  onClick={filters.onToggleFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </button>
              )}
              
              {actions?.onAdd && (
                <button
                  onClick={actions.onAdd}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add
                </button>
              )}
              
              {actions?.onExport && (
                <button
                  onClick={actions.onExport}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export
                </button>
              )}
              
              {actions?.onImport && (
                <button
                  onClick={actions.onImport}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Import
                </button>
              )}
              
              {actions?.onRefresh && (
                <button
                  onClick={actions.onRefresh}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Refresh
                </button>
              )}
            </div>
          </div>
          
          {filters?.showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {filters.children}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {data.length === 0 ? (
        renderEmptyState()
      ) : viewMode === 'cards' && cardRenderer ? (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((item, index) => (
            <div key={selection?.getItemId(item) || index}>
              {cardRenderer(item, index)}
            </div>
          ))}
        </div>
      ) : viewMode === 'list' && listRenderer ? (
        <div className="divide-y divide-gray-200">
          {data.map((item, index) => (
            <div key={selection?.getItemId(item) || index}>
              {listRenderer(item, index)}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y divide-gray-200 ${tableClassName}`}>
            {renderTableHeader()}
            {renderTableBody()}
          </table>
        </div>
      )}

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}
