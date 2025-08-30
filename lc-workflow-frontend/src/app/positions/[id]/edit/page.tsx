'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usePosition, useUpdatePosition } from '@/hooks/usePositions';
import { PositionCreate, PositionUpdate } from '@/types/models';
import { ArrowLeft, Save, Briefcase } from 'lucide-react';

export default function EditPositionPage() {
    const router = useRouter();
    const params = useParams();
    const positionId = params.id as string;

    const { data: position, isLoading } = usePosition(positionId);
    const updatePosition = useUpdatePosition(positionId);

    const [formData, setFormData] = useState<PositionCreate>({
        name: '',
        description: '',
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (position) {
            setFormData({
                name: position.name,
                description: position.description || '',
                is_active: position.is_active,
            });
        }
    }, [position]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Position name is required';
        } else if (formData.name.length < 2) {
            newErrors.name = 'Position name must be at least 2 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const submitData: PositionUpdate = {
            name: formData.name.trim(),
            description: formData.description?.trim() || undefined,
            is_active: formData.is_active ?? true,
        };

        updatePosition.mutate(submitData, {
            onSuccess: () => {
                router.push(`/positions/${positionId}`);
            },
        });
    };

    const handleChange = (field: keyof PositionCreate, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value as never }));
        if (errors[field as string]) {
            setErrors((prev) => ({ ...prev, [field as string]: '' }));
        }
    };

    if (isLoading) {
        return (
            <ProtectedRoute>
                <Layout>
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </Layout>
            </ProtectedRoute>
        );
    }

    if (!position) {
        return (
            <ProtectedRoute>
                <Layout>
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900">Position not found</h2>
                            <p className="text-gray-600 mt-2">The position you&apos;re looking for doesn&apos;t exist.</p>
                            <Link
                                href="/positions"
                                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back to Positions
                            </Link>
                        </div>
                    </div>
                </Layout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <Layout>
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-4">
                            <Link href={`/positions/${positionId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900">
                                <ArrowLeft className="h-5 w-5 mr-1" />
                                Back to Position
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Position</h1>
                        <p className="text-gray-600">Update position information</p>
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Icon */}
                            <div className="flex justify-center">
                                <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Briefcase className="h-10 w-10 text-blue-600" />
                                </div>
                            </div>

                            {/* Fields */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Position Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                                        placeholder="Enter position name"
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        rows={4}
                                        value={formData.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter position description (optional)"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        id="is_active"
                                        type="checkbox"
                                        checked={formData.is_active ?? true}
                                        onChange={(e) => handleChange('is_active', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                                        Active
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="border-t border-gray-200 pt-6">
                                <div className="flex justify-end space-x-4">
                                    <Link
                                        href={`/positions/${positionId}`}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={updatePosition.isPending}
                                        className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {updatePosition.isPending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Update Position
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </Layout>
        </ProtectedRoute>
    );
}