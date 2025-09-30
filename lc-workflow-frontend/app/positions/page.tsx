'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { usePositions, useDeletePosition } from '@/hooks/usePositions';
import { Position } from '@/types/models';
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    Briefcase,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

type PositionListItem = Omit<Position, 'id'> & { id: string };

export default function PositionsPage() {
    const router = useRouter();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isActiveOnly, setIsActiveOnly] = useState<boolean | ''>('');
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id?: string; name?: string }>({
        open: false,
    });

    const { data: positionsData, isLoading, error } = usePositions({
        page,
        size: 10,
        search: search || undefined,
        is_active: isActiveOnly === '' ? undefined : Boolean(isActiveOnly),
    }) as { data: { items: PositionListItem[]; total: number; pages: number } | undefined; isLoading: boolean; error: unknown };

    const deletePosition = useDeletePosition();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const handleDelete = (id: string, name?: string) => {
        setConfirmDelete({
            open: true,
            id,
            name,
        });
    };

    const confirmDeleteAction = () => {
        if (confirmDelete.id) {
            deletePosition.mutate(confirmDelete.id);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setIsActiveOnly('');
        setPage(1);
    };

    const totalPages = positionsData?.pages || 0;

    if (error) {
        return (
            <ProtectedRoute>
                <Layout>
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Positions</h1>
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
                            <Briefcase className="h-8 w-8 text-blue-600" />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Positions</h1>
                                <p className="text-gray-600">Manage job positions</p>
                            </div>
                        </div>
                        <Link
                            href="/positions/new"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            New Position
                        </Link>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search positions by name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="w-full sm:w-56">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
                                <select
                                    value={isActiveOnly === '' ? '' : isActiveOnly ? 'true' : 'false'}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setIsActiveOnly('');
                                        else setIsActiveOnly(val === 'true');
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Search
                            </button>
                            {(search || isActiveOnly !== '') && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Positions Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Loading positions...</p>
                        </div>
                    ) : positionsData?.items?.length === 0 ? (
                        <div className="p-8 text-center">
                            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No positions found</h3>
                            <p className="text-gray-600">Try adjusting your search criteria or add a new position.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Active
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {(positionsData?.items as unknown as PositionListItem[] | undefined)?.map((position) => (
                                            <tr key={position.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {position.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-700">
                                                    {position.description || <span className="text-gray-400">No description</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {position.is_active ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            <XCircle className="h-4 w-4 mr-1" /> Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => router.push(`/positions/${position.id}`)}
                                                            className="text-blue-600 hover:text-blue-900 p-1"
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/positions/${position.id}/edit`)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1"
                                                            title="Edit Position"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(position.id, position.name)}
                                                            className="text-red-600 hover:text-red-900 p-1"
                                                            title="Delete Position"
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
                            {totalPages > 1 && (
                                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    Showing{' '}
                                                    <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                                                    <span className="font-medium">
                                                        {Math.min(page * 10, positionsData?.total || 0)}
                                                    </span> of <span className="font-medium">{positionsData?.total || 0}</span> results
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
                                                        {page} of {totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                                        disabled={page === totalPages}
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

                <ConfirmDialog
                    isOpen={confirmDelete.open}
                    onClose={() => setConfirmDelete({ open: false })}
                    onConfirm={confirmDeleteAction}
                    title="Delete Position"
                    message={`Are you sure you want to delete "${confirmDelete.name || 'this position'}"? This action cannot be undone.`}
                    confirmText={deletePosition.isPending ? 'Deleting...' : 'Delete'}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            </Layout>
        </ProtectedRoute>
    );
}