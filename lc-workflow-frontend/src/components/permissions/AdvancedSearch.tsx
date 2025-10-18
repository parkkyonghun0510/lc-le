/**
 * AdvancedSearch Component
 * 
 * Advanced search and filtering with:
 * - Multi-field search
 * - Saved searches
 * - Search history
 * - Quick filters
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BookmarkIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in';
  value: any;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilter[];
  timestamp: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilter[]) => void;
  searchFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'multiselect' | 'date' | 'boolean';
    options?: Array<{ value: string; label: string }>;
  }>;
  placeholder?: string;
  className?: string;
}

export default function AdvancedSearch({
  onSearch,
  searchFields,
  placeholder = 'Search...',
  className = '',
}: AdvancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Load saved searches and history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('permission-saved-searches');
    const history = localStorage.getItem('permission-search-history');
    
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved searches', e);
      }
    }
    
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        console.error('Failed to load search history', e);
      }
    }
  }, []);

  // Trigger search on debounced term change
  useEffect(() => {
    if (debouncedSearch) {
      const searchFilter: SearchFilter = {
        field: 'all',
        operator: 'contains',
        value: debouncedSearch,
      };
      onSearch([searchFilter, ...filters]);
      
      // Add to history
      if (!searchHistory.includes(debouncedSearch)) {
        const newHistory = [debouncedSearch, ...searchHistory].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('permission-search-history', JSON.stringify(newHistory));
      }
    } else if (filters.length > 0) {
      onSearch(filters);
    } else {
      onSearch([]);
    }
  }, [debouncedSearch, filters]);

  const handleAddFilter = () => {
    setFilters([
      ...filters,
      {
        field: searchFields[0]?.key || '',
        operator: 'contains',
        value: '',
      },
    ]);
  };

  const handleUpdateFilter = (index: number, updates: Partial<SearchFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleSaveSearch = () => {
    const name = prompt('Enter a name for this search:');
    if (name) {
      const newSearch: SavedSearch = {
        id: Date.now().toString(),
        name,
        filters: [...filters],
        timestamp: new Date().toISOString(),
      };
      const updated = [...savedSearches, newSearch];
      setSavedSearches(updated);
      localStorage.setItem('permission-saved-searches', JSON.stringify(updated));
    }
  };

  const handleLoadSearch = (search: SavedSearch) => {
    setFilters(search.filters);
    setShowSaved(false);
  };

  const handleDeleteSavedSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('permission-saved-searches', JSON.stringify(updated));
  };

  const handleClearAll = () => {
    setSearchTerm('');
    setFilters([]);
    onSearch([]);
  };

  const hasActiveFilters = searchTerm || filters.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            aria-label="Search"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}

          {/* Search history dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                <ClockIcon className="h-4 w-4" />
                Recent searches
              </div>
              {searchHistory.map((term, index) => (
                <button
                  key={index}
                  onClick={() => setSearchTerm(term)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
            showAdvanced || filters.length > 0
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          aria-label="Toggle advanced filters"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Advanced</span>
          {filters.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-white text-xs">
              {filters.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowSaved(!showSaved)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Saved searches"
          title="Saved searches"
        >
          {savedSearches.length > 0 ? (
            <BookmarkSolidIcon className="h-5 w-5 text-indigo-600" />
          ) : (
            <BookmarkIcon className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Advanced Filters</h4>
            <div className="flex gap-2">
              {filters.length > 0 && (
                <button
                  onClick={handleSaveSearch}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Save search
                </button>
              )}
              <button
                onClick={handleAddFilter}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add filter
              </button>
            </div>
          </div>

          {filters.map((filter, index) => (
            <div key={index} className="flex gap-2 items-start">
              <select
                value={filter.field}
                onChange={(e) => handleUpdateFilter(index, { field: e.target.value })}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {searchFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>

              <select
                value={filter.operator}
                onChange={(e) =>
                  handleUpdateFilter(index, { operator: e.target.value as any })
                }
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="startsWith">Starts with</option>
                <option value="endsWith">Ends with</option>
              </select>

              <input
                type="text"
                value={filter.value}
                onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                placeholder="Value"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                onClick={() => handleRemoveFilter(index)}
                className="p-2 text-gray-400 hover:text-red-600"
                aria-label="Remove filter"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}

          {filters.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No filters added. Click "Add filter" to create one.
            </p>
          )}
        </div>
      )}

      {/* Saved searches panel */}
      {showSaved && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Saved Searches</h4>
          {savedSearches.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No saved searches yet. Create filters and save them for quick access.
            </p>
          ) : (
            <div className="space-y-2">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <button
                    onClick={() => handleLoadSearch(search)}
                    className="flex-1 text-left"
                  >
                    <div className="text-sm font-medium text-gray-900">{search.name}</div>
                    <div className="text-xs text-gray-500">
                      {search.filters.length} filter(s) • {new Date(search.timestamp).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteSavedSearch(search.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    aria-label="Delete saved search"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
