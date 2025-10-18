/**
 * SkeletonLoaders Component
 * 
 * Improved skeleton loading states for better perceived performance.
 * Provides specific skeletons for different component types.
 */

'use client';

import React from 'react';

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-gray-200 bg-gray-50">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-gray-300 rounded"></div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-white rounded-lg shadow">
          <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function MatrixSkeleton({ rows = 5, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Header row */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-48 p-3 border-r border-gray-200">
            <div className="h-4 bg-gray-300 rounded w-20"></div>
          </div>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="w-32 p-3 border-r border-gray-200">
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex border-b border-gray-100">
            <div className="w-48 p-3 border-r border-gray-200 bg-gray-50">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div key={colIndex} className="w-32 p-3 border-r border-gray-100 flex items-center justify-center">
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      ))}
      <div className="flex gap-3 justify-end">
        <div className="h-10 w-24 bg-gray-200 rounded"></div>
        <div className="h-10 w-24 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
}

export function AuditTrailSkeleton({ entries = 5 }: { entries?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: entries }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-6 bg-gray-300 rounded w-32"></div>
                <div className="h-5 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="flex gap-4">
                <div className="h-3 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      ))}
    </div>
  );
}
