'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  User, 
  Calendar, 
  AlertCircle,
  RefreshCw,
  FileText,
  Users,
  Shield,
  Settings,
  Target,
  Award
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
}

interface OnboardingStatus {
  user_id: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  progress_percentage: number;
  total_steps: number;
  completed_steps: number;
  applicable_steps: OnboardingStep[];
  days_since_creation: number;
  timeline: Array<{
    event: string;
    title: string;
    description: string;
    timestamp: string;
    type: string;
  }>;
  user_info: {
    username: string;
    email: string;
    full_name: string;
    role: string;
    department: string | null;
    branch: string | null;
    line_manager: string | null;
  };
}

interface OnboardingChecklistProps {
  userId: string;
  onStatusUpdate?: () => void;
  isManager?: boolean;
}

const STEP_ICONS: Record<string, any> = {
  profile_completion: User,
  system_access: Settings,
  department_introduction: Users,
  role_training: FileText,
  compliance_training: Shield,
  tools_training: Settings,
  mentor_assignment: User,
  initial_goals: Target
};

export default function OnboardingChecklist({ userId, onStatusUpdate, isManager = false }: OnboardingChecklistProps) {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOnboardingStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/users/${userId}/lifecycle/onboarding`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view this user\'s onboarding status');
        } else {
          setError('Failed to fetch onboarding status');
        }
        return;
      }

      const data = await response.json();
      setOnboardingStatus(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
      setError('Failed to fetch onboarding status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingStatus();
  }, [userId]);

  const handleCompleteOnboarding = async (notes?: string) => {
    if (!isManager) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/v1/users/${userId}/lifecycle/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      await fetchOnboardingStatus();
      onStatusUpdate?.();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestartOnboarding = async (reason?: string) => {
    if (!isManager) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/v1/users/${userId}/lifecycle/onboarding/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to restart onboarding');
      }

      await fetchOnboardingStatus();
      onStatusUpdate?.();
    } catch (error) {
      console.error('Error restarting onboarding:', error);
      alert('Failed to restart onboarding. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!onboardingStatus) {
    return null;
  }

  const getPriorityColor = (daysSinceCreation: number) => {
    if (daysSinceCreation > 14) return 'text-red-600 bg-red-50';
    if (daysSinceCreation > 7) return 'text-orange-600 bg-orange-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Onboarding Progress</h3>
          {isManager && (
            <div className="flex items-center space-x-2">
              {onboardingStatus.onboarding_completed ? (
                <button
                  onClick={() => {
                    const reason = prompt('Reason for restarting onboarding:');
                    if (reason) handleRestartOnboarding(reason);
                  }}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-1 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Restart
                </button>
              ) : (
                <button
                  onClick={() => {
                    const notes = prompt('Notes for completing onboarding (optional):');
                    handleCompleteOnboarding(notes || undefined);
                  }}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-1 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">User:</span>
              <span className="ml-2 text-gray-900">{onboardingStatus.user_info.full_name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Role:</span>
              <span className="ml-2 text-gray-900 capitalize">{onboardingStatus.user_info.role}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Department:</span>
              <span className="ml-2 text-gray-900">{onboardingStatus.user_info.department || 'Not assigned'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Branch:</span>
              <span className="ml-2 text-gray-900">{onboardingStatus.user_info.branch || 'Not assigned'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Line Manager:</span>
              <span className="ml-2 text-gray-900">{onboardingStatus.user_info.line_manager || 'Not assigned'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Days Since Creation:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(onboardingStatus.days_since_creation)}`}>
                {onboardingStatus.days_since_creation} days
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">
              {onboardingStatus.completed_steps}/{onboardingStatus.total_steps} steps
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                onboardingStatus.onboarding_completed 
                  ? 'bg-green-500' 
                  : onboardingStatus.progress_percentage > 0 
                    ? 'bg-blue-500' 
                    : 'bg-gray-400'
              }`}
              style={{ width: `${onboardingStatus.progress_percentage}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">0%</span>
            <span className="text-xs font-medium text-gray-700">
              {onboardingStatus.progress_percentage}%
            </span>
            <span className="text-xs text-gray-500">100%</span>
          </div>
        </div>

        {/* Status Badge */}
        {onboardingStatus.onboarding_completed ? (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-2" />
            Onboarding Completed
            {onboardingStatus.onboarding_completed_at && (
              <span className="ml-2 text-xs text-green-600">
                on {new Date(onboardingStatus.onboarding_completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <Clock className="h-4 w-4 mr-2" />
            Onboarding In Progress
          </div>
        )}
      </div>

      {/* Onboarding Steps */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 mb-3">Onboarding Checklist</h4>
        {onboardingStatus.applicable_steps.map((step, index) => {
          const IconComponent = STEP_ICONS[step.id] || FileText;
          return (
            <div
              key={step.id}
              className={`flex items-start space-x-3 p-4 rounded-lg border ${
                step.completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-shrink-0">
                <IconComponent className={`h-5 w-5 ${step.completed ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h5 className={`text-sm font-medium ${step.completed ? 'text-green-900' : 'text-gray-900'}`}>
                    {step.title}
                  </h5>
                  {step.required && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Required
                    </span>
                  )}
                </div>
                <p className={`text-sm ${step.completed ? 'text-green-700' : 'text-gray-600'}`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      {onboardingStatus.timeline.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
          <div className="space-y-3">
            {onboardingStatus.timeline.map((event, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  event.type === 'milestone' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h6 className="text-sm font-medium text-gray-900">{event.title}</h6>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}