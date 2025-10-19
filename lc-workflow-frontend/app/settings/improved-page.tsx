'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { FunctionalSettingsForm } from '@/components/settings/FunctionalSettingsForm';
import { useInitializeSettings } from '@/hooks/useSettings';
import {
    Cog6ToothIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    ShieldCheckIcon,
    DocumentTextIcon,
    BellIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

interface SettingSection {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
    implemented: boolean;
}

const settingSections: SettingSection[] = [
    {
        id: 'general',
        name: 'General Settings',
        description: 'Basic application configuration and preferences',
        icon: Cog6ToothIcon,
        implemented: true,
    },
    {
        id: 'security',
        name: 'Security & Authentication',
        description: 'Password policies, session settings, and security options',
        icon: ShieldCheckIcon,
        adminOnly: true,
        implemented: true,
    },
    {
        id: 'users',
        name: 'User Management',
        description: 'Default user settings, roles, and permissions',
        icon: UserGroupIcon,
        adminOnly: true,
        implemented: true,
    },
    {
        id: 'applications',
        name: 'Application Settings',
        description: 'Loan application workflow and approval settings',
        icon: DocumentTextIcon,
        implemented: true,
    },
    {
        id: 'notifications',
        name: 'Notifications',
        description: 'Email notifications and alert preferences',
        icon: BellIcon,
        implemented: true,
    },
    {
        id: 'organization',
        name: 'Organization',
        description: 'Company information, departments, and branches',
        icon: BuildingOfficeIcon,
        implemented: false,
    },
];

export default function ImprovedSettingsPage() {
    const { user } = useAuth();
    const { can, loading: permissionsLoading } = usePermissionCheck();
    const [activeSection, setActiveSection] = useState('general');
    const initializeMutation = useInitializeSettings();

    // Check if user has system management permission (replaces admin role check)
    const canManageSystem = can('system', 'manage');

    // Filter sections based on user permissions
    const availableSections = settingSections.filter(section => {
        if (!section.adminOnly) return true;
        // While permissions are loading, show sections to avoid flickering
        if (permissionsLoading) return true;
        return canManageSystem;
    });

    const activeSettingSection = availableSections.find(s => s.id === activeSection);

    const handleInitializeSettings = () => {
        initializeMutation.mutate();
    };

    const renderSettingContent = () => {
        if (!activeSettingSection) {
            return <div className="p-6">Section not found</div>;
        }

        if (!activeSettingSection.implemented) {
            return (
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{activeSettingSection.name}</h3>
                        <p className="text-gray-600">{activeSettingSection.description}</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                                {activeSettingSection.name} are coming soon
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <FunctionalSettingsForm
                category={activeSection}
                title={activeSettingSection.name}
                description={activeSettingSection.description}
            />
        );
    };

    return (
        <ProtectedRoute requiredRoles={['admin', 'manager']}>
            <Layout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Cog6ToothIcon className="h-8 w-8 text-gray-600" />
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                                    <p className="text-gray-600">Manage your LC Workflow application settings</p>
                                </div>
                            </div>
                            
                            {canManageSystem && (
                                <button
                                    onClick={handleInitializeSettings}
                                    disabled={initializeMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {initializeMutation.isPending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Initializing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="h-4 w-4" />
                                            Initialize Defaults
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-6">
                        {/* Settings Navigation */}
                        <div className="w-80 flex-shrink-0">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="p-4 border-b border-gray-200">
                                    <h2 className="text-lg font-semibold text-gray-900">Settings Categories</h2>
                                </div>
                                <nav className="p-2">
                                    {availableSections.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                                                activeSection === section.id
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <section.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                                activeSection === section.id ? 'text-blue-600' : 'text-gray-400'
                                            }`} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{section.name}</span>
                                                    {section.implemented ? (
                                                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 mt-1">
                                                    {section.description}
                                                </div>
                                                {section.adminOnly && (
                                                    <div className="text-xs text-blue-600 mt-1 font-medium">
                                                        Admin Only
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Settings Status */}
                            <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Implementation Status</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Implemented</span>
                                        <span className="font-medium text-green-600">
                                            {availableSections.filter(s => s.implemented).length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Coming Soon</span>
                                        <span className="font-medium text-yellow-600">
                                            {availableSections.filter(s => !s.implemented).length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Total</span>
                                        <span className="font-medium text-gray-900">
                                            {availableSections.length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Settings Content */}
                        <div className="flex-1">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                {renderSettingContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </ProtectedRoute>
    );
}