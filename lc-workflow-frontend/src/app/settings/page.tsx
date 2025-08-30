'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { 
  useSettings, 
  useBulkUpdateSettings, 
  useInitializeSettings,
  useGeneralSettings,
  useSecuritySettings,
  useUserSettings,
  useApplicationSettings,
  useNotificationSettings
} from '@/hooks/useSettings';
import { ThemeSettings } from '@/components/settings/ThemeSettings';
import {
    Cog6ToothIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    ShieldCheckIcon,
    DocumentTextIcon,
    ServerIcon,
    BellIcon,
    GlobeAltIcon,
    CircleStackIcon,
    ChartBarIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SettingSection {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
}

const settingSections: SettingSection[] = [
    {
        id: 'general',
        name: 'General Settings',
        description: 'Basic application configuration and preferences',
        icon: Cog6ToothIcon,
    },
    {
        id: 'users',
        name: 'User Management',
        description: 'Default user settings, roles, and permissions',
        icon: UserGroupIcon,
        adminOnly: true,
    },
    {
        id: 'organization',
        name: 'Organization',
        description: 'Company information, departments, and branches',
        icon: BuildingOfficeIcon,
    },
    {
        id: 'security',
        name: 'Security & Authentication',
        description: 'Password policies, session settings, and security options',
        icon: ShieldCheckIcon,
        adminOnly: true,
    },
    {
        id: 'applications',
        name: 'Application Settings',
        description: 'Loan application workflow and approval settings',
        icon: DocumentTextIcon,
    },
    {
        id: 'notifications',
        name: 'Notifications',
        description: 'Email notifications and alert preferences',
        icon: BellIcon,
    },
    {
        id: 'theme',
        name: 'Theme & Appearance',
        description: 'Customize the look and feel of the application',
        icon: CircleStackIcon,
    },
    {
        id: 'backup',
        name: 'Backup & Recovery',
        description: 'Data backup settings and recovery options',
        icon: CircleStackIcon,
        adminOnly: true,
    },
    {
        id: 'analytics',
        name: 'Analytics & Reporting',
        description: 'Reporting preferences and analytics configuration',
        icon: ChartBarIcon,
    },
    {
        id: 'system',
        name: 'System Settings',
        description: 'Server configuration and maintenance settings',
        icon: ServerIcon,
        adminOnly: true,
    },
];

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('general');
    const [hasInitialized, setHasInitialized] = useState(false);

    // Load settings data
    const { data: allSettings, isLoading: settingsLoading, error: settingsError } = useSettings();
    const { data: generalSettings, isLoading: generalLoading } = useGeneralSettings();
    const { data: securitySettings, isLoading: securityLoading } = useSecuritySettings();
    const { data: userSettings, isLoading: userLoading } = useUserSettings();
    const { data: applicationSettings, isLoading: applicationLoading } = useApplicationSettings();
    const { data: notificationSettings, isLoading: notificationLoading } = useNotificationSettings();

    // Mutations
    const bulkUpdateMutation = useBulkUpdateSettings();
    const initializeMutation = useInitializeSettings();

    // Initialize default settings if none exist
    useEffect(() => {
        if (!settingsLoading && !hasInitialized && allSettings && Object.keys(allSettings).length === 0) {
            initializeMutation.mutate();
            setHasInitialized(true);
        }
    }, [settingsLoading, allSettings, hasInitialized, initializeMutation]);

    // Check if user is admin
    const isAdmin = user?.role === 'admin';

    // Filter sections based on user role
    const availableSections = settingSections.filter(section =>
        !section.adminOnly || isAdmin
    );

    const renderSettingContent = () => {
        switch (activeSection) {
            case 'general':
                return <GeneralSettings />;
            case 'users':
                return <UserManagementSettings />;
            case 'organization':
                return <OrganizationSettings />;
            case 'security':
                return <SecuritySettings />;
            case 'applications':
                return <ApplicationSettings />;
            case 'notifications':
                return <NotificationSettings />;
            case 'theme':
                return <ThemeSettings />;
            case 'backup':
                return <BackupSettings />;
            case 'analytics':
                return <AnalyticsSettings />;
            case 'system':
                return <SystemSettings />;
            default:
                return <GeneralSettings />;
        }
    };

    return (
        <ProtectedRoute requiredRoles={['admin']}>
            <Layout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3">
                            <Cog6ToothIcon className="h-8 w-8 text-gray-600" />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                                <p className="text-gray-600">Manage your LC Workflow application settings</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        {/* Settings Navigation */}
                        <div className="w-80 flex-shrink-0">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="p-4 border-b border-gray-200">
                                    <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                                </div>
                                <nav className="p-2">
                                    {availableSections.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${activeSection === section.id
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <section.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${activeSection === section.id ? 'text-blue-600' : 'text-gray-400'
                                                }`} />
                                            <div className="min-w-0">
                                                <div className="font-medium">{section.name}</div>
                                                <div className="text-sm text-gray-500 mt-1">
                                                    {section.description}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </nav>
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

// Settings Components
function GeneralSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">General Settings</h3>
                <p className="text-gray-600">Configure basic application settings and preferences.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Application Name
                    </label>
                    <input
                        type="text"
                        defaultValue="LC Workflow System"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                    </label>
                    <input
                        type="text"
                        placeholder="Your Company Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Language
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="en">English</option>
                        <option value="km">Khmer</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="Asia/Phnom_Penh">Asia/Phnom_Penh</option>
                        <option value="UTC">UTC</option>
                    </select>
                </div>

                <div className="pt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function UserManagementSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600">Configure default user settings and role permissions.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Default User Settings</h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Default Role for New Users
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="officer">Officer</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="require-approval"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="require-approval" className="ml-2 text-sm text-gray-700">
                                Require admin approval for new user accounts
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="email-verification"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="email-verification" className="ml-2 text-sm text-gray-700">
                                Require email verification for new accounts
                            </label>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function OrganizationSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Organization Settings</h3>
                <p className="text-gray-600">Manage company information and organizational structure.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Logo
                    </label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Upload Logo
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Address
                    </label>
                    <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter company address"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function SecuritySettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Security Settings</h3>
                <p className="text-gray-600">Configure security policies and authentication settings.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Minimum Password Length
                            </label>
                            <input
                                type="number"
                                defaultValue="8"
                                min="6"
                                max="32"
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="require-uppercase"
                                    defaultChecked
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="require-uppercase" className="ml-2 text-sm text-gray-700">
                                    Require uppercase letters
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="require-numbers"
                                    defaultChecked
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="require-numbers" className="ml-2 text-sm text-gray-700">
                                    Require numbers
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="require-special"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="require-special" className="ml-2 text-sm text-gray-700">
                                    Require special characters
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Session Settings</h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Session Timeout (minutes)
                            </label>
                            <input
                                type="number"
                                defaultValue="30"
                                min="5"
                                max="480"
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="force-logout"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="force-logout" className="ml-2 text-sm text-gray-700">
                                Force logout on browser close
                            </label>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function ApplicationSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Settings</h3>
                <p className="text-gray-600">Configure loan application workflow and approval settings.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Workflow Settings</h4>

                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="auto-assign"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="auto-assign" className="ml-2 text-sm text-gray-700">
                                Auto-assign applications to available officers
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="require-manager-approval"
                                defaultChecked
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="require-manager-approval" className="ml-2 text-sm text-gray-700">
                                Require manager approval for applications over threshold
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Manager Approval Threshold ($)
                            </label>
                            <input
                                type="number"
                                defaultValue="10000"
                                className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function NotificationSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Notification Settings</h3>
                <p className="text-gray-600">Configure email notifications and alert preferences.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h4>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">New Application Submitted</div>
                                <div className="text-sm text-gray-500">Notify managers when new applications are submitted</div>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">Application Status Changes</div>
                                <div className="text-sm text-gray-500">Notify users when application status changes</div>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">System Maintenance</div>
                                <div className="text-sm text-gray-500">Notify users about scheduled maintenance</div>
                            </div>
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function IntegrationSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Integration Settings</h3>
                <p className="text-gray-600">Configure third-party services and API integrations.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                            Integration settings are coming soon
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BackupSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Backup & Recovery</h3>
                <p className="text-gray-600">Configure data backup settings and recovery options.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                            Backup settings are coming soon
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnalyticsSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Reporting</h3>
                <p className="text-gray-600">Configure reporting preferences and analytics settings.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                            Analytics settings are coming soon
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SystemSettings() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">System Settings</h3>
                <p className="text-gray-600">Configure server and system-level settings.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                            System settings are coming soon
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}