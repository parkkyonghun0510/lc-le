'use client';

import { useState } from 'react';
import { useDepartmentsWithCounts, useDeleteDepartment } from '@/hooks/useDepartments';
import { Department } from '@/types/models';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  Users,
  MoreVertical,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DepartmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState<Department | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const pageSize = 10;

  const { 
    data: departmentsData, 
    isLoading, 
    error 
  } = useDepartmentsWithCounts({
    page: currentPage,
    size: pageSize,
    search: searchTerm || undefined,
  });

  const deleteDepartment = useDeleteDepartment();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleDelete = async (department: Department) => {
    deleteDepartment.mutate(department.id, {
      onSuccess: () => {
        setShowDeleteModal(null);
      },
    });
  };

  const totalPages = departmentsData ? Math.ceil(departmentsData.total / pageSize) : 0;

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Error loading departments</h2>
              <p className="text-gray-600 mt-2">Please try again later.</p>
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
              <p className="text-gray-600">Manage organizational departments</p>
            </div>
            <Link
              href="/departments/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Department
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Departments List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : departmentsData?.items?.length === 0 ? (
            <div className="text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No departments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating a new department.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <Link
                    href="/departments/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Department
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-12 gap-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-3">Department</div>
                  <div className="col-span-2">Code</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-2">Users</div>
                  <div className="col-span-1">Created</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {departmentsData?.items?.map((department) => (
                  <div key={department.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {department.name}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-gray-900">
                          {department.code}
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="text-sm text-gray-900">
                          {department.description || 'No description'}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center text-sm text-gray-900">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          {department?.user_count || 0}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="text-sm text-gray-900">
                          {new Date(department.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="relative">
                          <button
                            onClick={() => setDropdownOpen(dropdownOpen === department.id ? null : department.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {dropdownOpen === department.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <Link
                                  href={`/departments/${department.id}`}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={() => setDropdownOpen(null)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                                <Link
                                  href={`/departments/${department.id}/edit`}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={() => setDropdownOpen(null)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                                <button
                                  onClick={() => {
                                    setShowDeleteModal(department);
                                    setDropdownOpen(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, departmentsData?.total || 0)} of {departmentsData?.total || 0} results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Department</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{showDeleteModal.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                disabled={deleteDepartment.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteDepartment.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setDropdownOpen(null)}
        />
      )}
      </Layout>
    </ProtectedRoute>
  );
}