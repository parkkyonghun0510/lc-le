'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  FileText, 
  Users, 
  Shield, 
  Archive,
  CheckCircle,
  Clock,
  X,
  User
} from 'lucide-react';

interface OffboardingWorkflowProps {
  userId: string;
  userName: string;
  userRole: string;
  currentStatus: string;
  onComplete?: () => void;
  onCancel?: () => void;
  isManager?: boolean;
}

interface OffboardingStep {
  id: string;
  title: string;
  description: string;
  category: 'security' | 'handover' | 'admin' | 'hr';
  completed: boolean;
  required: boolean;
}

const OFFBOARDING_STEPS: OffboardingStep[] = [
  {
    id: 'access_revocation',
    title: 'Revoke System Access',
    description: 'Disable user accounts and remove system permissions',
    category: 'security',
    completed: false,
    required: true
  },
  {
    id: 'data_backup',
    title: 'Backup User Data',
    description: 'Secure important files and documents created by the user',
    category: 'admin',
    completed: false,
    required: true
  },
  {
    id: 'knowledge_transfer',
    title: 'Knowledge Transfer',
    description: 'Document key processes and transfer knowledge to team members',
    category: 'handover',
    completed: false,
    required: true
  },
  {
    id: 'equipment_return',
    title: 'Equipment Return',
    description: 'Collect company equipment, devices, and access cards',
    category: 'admin',
    completed: false,
    required: true
  },
  {
    id: 'project_handover',
    title: 'Project Handover',
    description: 'Transfer ongoing projects and responsibilities to other team members',
    category: 'handover',
    completed: false,
    required: true
  },
  {
    id: 'final_documentation',
    title: 'Final Documentation',
    description: 'Complete final reports and documentation',
    category: 'admin',
    completed: false,
    required: true
  },
  {
    id: 'exit_interview',
    title: 'Exit Interview',
    description: 'Conduct exit interview to gather feedback',
    category: 'hr',
    completed: false,
    required: false
  }
];

const CATEGORY_COLORS = {
  security: 'bg-red-50 border-red-200 text-red-800',
  handover: 'bg-blue-50 border-blue-200 text-blue-800',
  admin: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  hr: 'bg-green-50 border-green-200 text-green-800'
};

const CATEGORY_ICONS = {
  security: Shield,
  handover: Users,
  admin: FileText,
  hr: User
};

export default function OffboardingWorkflow({ 
  userId, 
  userName, 
  userRole, 
  currentStatus, 
  onComplete, 
  onCancel, 
  isManager = false 
}: OffboardingWorkflowProps) {
  const [steps, setSteps] = useState<OffboardingStep[]>(OFFBOARDING_STEPS);
  const [reason, setReason] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInitiateForm, setShowInitiateForm] = useState(currentStatus !== 'inactive');
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const handleStepToggle = (stepId: string) => {
    if (!isManager) return;
    
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, completed: !step.completed }
        : step
    ));
  };

  const handleInitiateOffboarding = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for offboarding');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/users/${userId}/lifecycle/offboarding/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          reason: reason.trim(),
          last_working_day: lastWorkingDay || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate offboarding');
      }

      setShowInitiateForm(false);
      alert('Offboarding process initiated successfully');
      onComplete?.();
    } catch (error) {
      console.error('Error initiating offboarding:', error);
      alert('Failed to initiate offboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOffboarding = async () => {
    const requiredSteps = steps.filter(step => step.required);
    const completedRequiredSteps = requiredSteps.filter(step => step.completed);
    
    if (completedRequiredSteps.length !== requiredSteps.length) {
      alert('Please complete all required steps before finalizing offboarding');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/users/${userId}/lifecycle/offboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          notes: notes.trim() || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete offboarding');
      }

      alert('Offboarding completed successfully. User has been archived.');
      onComplete?.();
    } catch (error) {
      console.error('Error completing offboarding:', error);
      alert('Failed to complete offboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const requiredSteps = steps.filter(step => step.required);
  const completedRequiredSteps = requiredSteps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  if (showInitiateForm) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">Initiate Offboarding Process</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800 mb-1">Important Notice</h4>
              <p className="text-sm text-orange-700">
                This will initiate the offboarding process for <strong>{userName}</strong> ({userRole}). 
                This action will set the user status to inactive and begin the formal offboarding workflow.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Offboarding <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please provide a detailed reason for the offboarding..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Working Day (Optional)
            </label>
            <input
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              If specified, this will help plan the transition timeline
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInitiateOffboarding}
            disabled={loading || !reason.trim()}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Initiating...' : 'Initiate Offboarding'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Archive className="h-6 w-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Offboarding Workflow</h3>
        </div>
        {isManager && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCompleteForm(!showCompleteForm)}
              disabled={loading || completedRequiredSteps !== requiredSteps.length}
              className="inline-flex items-center px-3 py-1 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive className="h-4 w-4 mr-1" />
              Complete Offboarding
            </button>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">User:</span>
            <span className="ml-2 text-gray-900">{userName}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Role:</span>
            <span className="ml-2 text-gray-900 capitalize">{userRole}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {currentStatus === 'inactive' ? 'Offboarding in Progress' : currentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Offboarding Progress</span>
          <span className="text-sm text-gray-600">
            {completedSteps}/{totalSteps} steps ({completedRequiredSteps}/{requiredSteps.length} required)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-orange-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Offboarding Steps */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-900">Offboarding Checklist</h4>
        {steps.map((step) => {
          const IconComponent = CATEGORY_ICONS[step.category];
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
                {isManager ? (
                  <button
                    onClick={() => handleStepToggle(step.id)}
                    className="focus:outline-none"
                  >
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 hover:border-gray-400"></div>
                    )}
                  </button>
                ) : (
                  step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )
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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${CATEGORY_COLORS[step.category]}`}>
                    {step.category}
                  </span>
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

      {/* Complete Offboarding Form */}
      {showCompleteForm && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Complete Offboarding</h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h5 className="font-medium text-red-800 mb-1">Final Step</h5>
                <p className="text-sm text-red-700">
                  This will archive the user account and complete the offboarding process. 
                  This action cannot be undone easily.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Final Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any final notes about the offboarding process..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setShowCompleteForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteOffboarding}
              disabled={loading || completedRequiredSteps !== requiredSteps.length}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Completing...' : 'Archive User'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}