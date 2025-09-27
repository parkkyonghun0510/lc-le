'use client';

import { X } from 'lucide-react';

interface FilterChip {
  id: string;
  label: string;
  value: string;
  displayValue?: string;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onRemoveFilter: (filterId: string) => void;
  onClearAll: () => void;
}

export default function FilterChips({ filters, onRemoveFilter, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-blue-800">Active Filters</h3>
        <button
          onClick={onClearAll}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Clear All
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <div
            key={filter.id}
            className="inline-flex items-center bg-white border border-blue-200 rounded-full px-3 py-1 text-sm"
          >
            <span className="text-blue-800 font-medium mr-1">{filter.label}:</span>
            <span className="text-blue-600">{filter.displayValue || filter.value}</span>
            <button
              onClick={() => onRemoveFilter(filter.id)}
              className="ml-2 text-blue-400 hover:text-blue-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}