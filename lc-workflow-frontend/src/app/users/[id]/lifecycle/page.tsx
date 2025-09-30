'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Settings,
  AlertCircle
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import OnboardingChecklist from '@/components/users/OnboardingChecklist';
import OffboardingWorkflow from '@/components/users/OffboardingWorkflow';
import LifecycleTimeline from '@/components/users/LifecycleTimeline';
import StatusIndicator from '@/components/ui/StatusIndicator';

interface UserData {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    name: string;
  } | null;
  line_manager: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  created_at: string;
  last_login_at: string | null;
}

export default function UserLifecyclePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'onboarding' | 'offboarding' | 'timeline'>('onboarding');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    fetchUserData();
    getCurrentUserRole();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('[DEBUG UserLifecycle] No access token found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('[DEBUG UserLifecycle] Fetching user data:', {
        userId,
        hasToken: !!token,
        tokenLength: token.length,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`/api/v1/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found');
        } else if (response.status === 403) {
          setError('You do not have permission to view this user');
        } else if (response.status === 401) {
          console.log('[DEBUG UserLifecycle] 401 error - token may be expired');
          setError('Session expired. Please log in again.');
          router.push('/login');
          return;
        } else {
          setError('Failed to fetch user data');
        }
        return;
      }

      const userData = await response.json();
      setUser(userData);
      setError(null);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserRole = () => {
    // Get role from user data stored in localStorage (consistent with rest of app)
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserRole(user.role || '');
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  };

  const handleStatusUpdate = () => {
    fetchUserData();
  };

  if (loading) {
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

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!user) {
    return null;
  }

  const isManager = ['admin', 'manager'].includes(currentUserRole);
  const fullName = `${user.first_name} ${user.last_name}`;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <div className="flex items-center space-x-3">
                <User className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">User Lifecycle</h1>
                  <p className="text-gray-600">{fullName} • {user.role}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <StatusIndicator status={user.status} />
              <div className="text-right text-sm text-gray-500">
                <div>Created: {new Date(user.created_at).toLocaleDateString()}</div>
                <div>
                  Last Login: {user.last_login_at 
                    ? new Date(user.last_login_at).toLocaleDateString() 
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* User Summary Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <p className="text-gray-900">{user.department?.name || 'Not assigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <p className="text-gray-900">{user.branch?.name || 'Not assigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Line Manager</label>
                <p className="text-gray-900">
                  {user.line_manager 
                    ? `${user.line_manager.first_name} ${user.line_manager.last_name}`
                    : 'Not assigned'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('onboarding')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'onboarding'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                Onboarding
              </button>
              <button
                onClick={() => setActiveTab('offboarding')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'offboarding'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Offboarding
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                Timeline
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'onboarding' && (
              <OnboardingChecklist
                userId={userId}
                onStatusUpdate={handleStatusUpdate}
                isManager={isManager}
              />
            )}

            {activeTab === 'offboarding' && (
              <OffboardingWorkflow
                userId={userId}
                userName={fullName}
                userRole={user.role}
                currentStatus={user.status}
                onComplete={handleStatusUpdate}
                onCancel={() => setActiveTab('onboarding')}
                isManager={isManager}
              />
            )}

            {activeTab === 'timeline' && (
              <LifecycleTimeline
                userId={userId}
                userName={fullName}
              />
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}