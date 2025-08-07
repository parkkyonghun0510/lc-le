'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usePosition } from '@/hooks/usePositions';
import {
    ArrowLeft,
    Briefcase,
    Calendar,
    CheckCircle2,
    XCircle,
    Edit,
} from 'lucide-react';

export default function PositionDetailPage() {
    const params = useParams();
    const positionId = params.id as string;

    const { data: position, isLoading, error } = usePosition(positionId);

    if (isLoading) {
        return (
            <ProtectedRoute>
                <Layout>
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </Layout>
            </ProtectedRoute>
        );
    }

    if (error || !position) {
        return (
            <ProtectedRoute>
                <Layout>
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900">Position not found</h2>
                            <p className="text-gray-600 mt-2">The position you&#39;re looking for doesn&#39;t exist.</p>
                            <Link href="/positions" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700">
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back to Positions
                            </Link>
                        </div>
                    </div>
                </Layout>
            </ProtectedRoute>
        );
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <ProtectedRoute>
            <Layout>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Link href="/positions" className="inline-flex items-center text-gray-600 hover:text-gray-900">
                                    <ArrowLeft className="h-5 w-5 mr-1" />
                                    Back to Positions
                                </Link>
                            </div>
                            <Link
                                href={`/positions/${positionId}/edit`}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Position
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mt-4">Position Details</h1>
                    </div>

                    {/* Position Overview Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {/* Header Section */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
                            <div className="flex items-center space-x-4">
                                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
                                    <Briefcase className="h-10 w-10 text-blue-600" />
                                </div>
                                <div className="text-white">
                                    <h2 className="text-2xl font-bold">{position.name}</h2>
                                    <p className="text-blue-100 mt-1">
                                        {position.description || 'No description provided'}
                                    </p>
                                    <div className="mt-2">
                                        {position.is_active ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <XCircle className="h-3 w-3 mr-1" /> Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center space-x-3">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Created</p>
                                        <p className="text-sm text-gray-600">{formatDate(position.created_at)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Last Updated</p>
                                        <p className="text-sm text-gray-600">{formatDate(position.updated_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* System Information */}
                            <div className="mt-8 pt-8 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-900">Position ID:</span>
                                            <span className="ml-2 text-gray-600 font-mono">{String(position.id)}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-900">Name:</span>
                                            <span className="ml-2 text-gray-600">{position.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </ProtectedRoute>
    );
}
