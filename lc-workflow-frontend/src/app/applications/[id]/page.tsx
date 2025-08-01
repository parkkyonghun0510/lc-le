'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplication, useSubmitApplication, useApproveApplication, useRejectApplication } from '@/hooks/useApplications';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  IdentificationIcon,
  PhoneIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  BanknotesIcon,
  HomeIcon,
  TruckIcon,
  AcademicCapIcon,
  HeartIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

const statusConfig = {
  draft: { 
    label: 'ព្រាង', 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    icon: DocumentTextIcon,
    khmer: 'ព្រាង'
  },
  submitted: { 
    label: 'បានដាក់ស្នើ', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: ClockIcon,
    khmer: 'បានដាក់ស្នើ'
  },
  pending: { 
    label: 'កំពុងរង់ចាំ', 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    icon: ClockIcon,
    khmer: 'កំពុងរង់ចាំ'
  },
  under_review: { 
    label: 'កំពុងពិនិត្យ', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: ClockIcon,
    khmer: 'កំពុងពិនិត្យ'
  },
  approved: { 
    label: 'អនុម័ត', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircleIcon,
    khmer: 'អនុម័ត'
  },
  rejected: { 
    label: 'បដិសេធ', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: XCircleIcon,
    khmer: 'បដិសេធ'
  }
};

const purposeIcons = {
  business: BanknotesIcon,
  agriculture: HomeIcon,
  education: AcademicCapIcon,
  housing: HomeIcon,
  vehicle: TruckIcon,
  medical: HeartIcon,
  other: EllipsisHorizontalIcon
};

const purposeLabels = {
  business: 'អាជីវកម្ម',
  agriculture: 'កសិកម្ម',
  education: 'អប់រំ',
  housing: 'លំនៅដ្ឋាន',
  vehicle: 'យានយន្ត',
  medical: 'វេជ្ជសាស្ត្រ',
  other: 'ផ្សេងៗ'
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const applicationId = params.id as string;
  const { data: application, isLoading, error } = useApplication(applicationId);
  const submitMutation = useSubmitApplication();
  const approveMutation = useApproveApplication();
  const rejectMutation = useRejectApplication();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !application) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-2">រកមិនឃើញពាក្យសុំ</h2>
            <p className="text-gray-600 mb-4">ពាក្យសុំនេះមិនមានឬត្រូវបានលុប</p>
            <Link
              href="/applications"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              ត្រលប់ទៅបញ្ជីពាក្យសុំ
            </Link>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const config = statusConfig[application.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = config.icon;

  const canEdit = user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id;
  const canApprove = (user?.role === 'admin' || user?.role === 'manager') && application.status === 'submitted';
  const canSubmit = application.user_id === user?.id && application.status === 'draft';

  const handleSubmit = () => {
    submitMutation.mutate(applicationId);
  };

  const handleApprove = () => {
    approveMutation.mutate(applicationId);
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      rejectMutation.mutate({ id: applicationId, reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {application.full_name_khmer || application.full_name_latin || 'ពាក្យសុំកម្ចី'}
                </h1>
                <p className="text-gray-600">
                  កាលបរិច្ឆេទបង្កើត: {formatDate(application.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${config.color}`}>
                <StatusIcon className="w-5 h-5 mr-2" />
                {config.khmer}
              </div>

              {/* Actions */}
              {canEdit && (
                <Link
                  href={`/applications/${applicationId}/edit`}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <PencilIcon className="w-4 h-4 mr-2" />
                  កែប្រែ
                </Link>
              )}

              {canSubmit && (
                <button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <DocumentTextIcon className="w-4 h-4 mr-2" />
                  {submitMutation.isPending ? 'កំពុងដាក់ស្នើ...' : 'ដាក់ស្នើ'}
                </button>
              )}

              {canApprove && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    {approveMutation.isPending ? 'កំពុងអនុម័ត...' : 'អនុម័ត'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircleIcon className="w-4 h-4 mr-2" />
                    បដិសេធ
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <UserIcon className="w-6 h-6 mr-2 text-blue-600" />
                  ព័ត៌មានអតិថិជន
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ឈ្មោះជាភាសាខ្មែរ
                      </label>
                      <p className="text-lg font-semibold text-gray-900">
                        {application.full_name_khmer || 'មិនបានបញ្ជាក់'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ឈ្មោះជាអក្សរឡាតាំង
                      </label>
                      <p className="text-gray-900">
                        {application.full_name_latin || 'មិនបានបញ្ជាក់'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        លេខទូរស័ព្ទ
                      </label>
                      <div className="flex items-center">
                        <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <p className="text-gray-900">
                          {application.phone || 'មិនបានបញ្ជាក់'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ប្រភេទអត្តសញ្ញាណប័ណ្ណ
                      </label>
                      <p className="text-gray-900">
                        {application.id_card_type || 'មិនបានបញ្ជាក់'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        លេខអត្តសញ្ញាណប័ណ្ណ
                      </label>
                      <div className="flex items-center">
                        <IdentificationIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <p className="text-gray-900 font-mono">
                          {application.id_number || 'មិនបានបញ្ជាក់'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ថ្ងៃខែឆ្នាំកំណើត
                      </label>
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <p className="text-gray-900">
                          {application.date_of_birth ? formatDate(application.date_of_birth) : 'មិនបានបញ្ជាក់'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <CurrencyDollarIcon className="w-6 h-6 mr-2 text-green-600" />
                  ព័ត៌មានកម្ចី
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ចំនួនទឹកប្រាក់ស្នើសុំ
                      </label>
                      <p className="text-2xl font-bold text-green-600">
                        {application.requested_amount 
                          ? formatCurrency(application.requested_amount)
                          : 'មិនបានបញ្ជាក់'
                        }
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        រយៈពេលកម្ចី
                      </label>
                      <p className="text-gray-900">
                        {application.desired_loan_term || 'មិនបានបញ្ជាក់'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ប្រភេទផលិតផល
                      </label>
                      <p className="text-gray-900">
                        {application.product_type || 'មិនបានបញ្ជាក់'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        កាលបរិច្ឆេទចង់បានប្រាក់
                      </label>
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <p className="text-gray-900">
                          {application.requested_disbursement_date 
                            ? formatDate(application.requested_disbursement_date)
                            : 'មិនបានបញ្ជាក់'
                          }
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        គោលបំណងប្រើប្រាស់
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {application.loan_purposes && application.loan_purposes.length > 0 ? (
                          application.loan_purposes.map((purpose, index) => {
                            const Icon = purposeIcons[purpose as keyof typeof purposeIcons] || EllipsisHorizontalIcon;
                            const label = purposeLabels[purpose as keyof typeof purposeLabels] || purpose;
                            return (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                              >
                                <Icon className="w-4 h-4 mr-1" />
                                {label}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-gray-500">មិនបានបញ្ជាក់</span>
                        )}
                      </div>
                    </div>

                    {application.purpose_details && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ព័ត៌មានលម្អិតអំពីគោលបំណង
                        </label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                          {application.purpose_details}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Guarantor Information */}
              {(application.guarantor_name || application.guarantor_phone) && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <UserGroupIcon className="w-6 h-6 mr-2 text-purple-600" />
                    ព័ត៌មានអ្នកធានា
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ឈ្មោះអ្នកធានា
                      </label>
                      <p className="text-lg font-semibold text-gray-900">
                        {application.guarantor_name || 'មិនបានបញ្ជាក់'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        លេខទូរស័ព្ទអ្នកធានា
                      </label>
                      <div className="flex items-center">
                        <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <p className="text-gray-900">
                          {application.guarantor_phone || 'មិនបានបញ្ជាក់'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents */}
              {application.documents && application.documents.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <DocumentDuplicateIcon className="w-6 h-6 mr-2 text-orange-600" />
                    ឯកសារភ្ជាប់
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {application.documents.map((doc, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center mb-2">
                          <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {doc.name || `ឯកសារ ${index + 1}`}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {doc.type || 'ប្រភេទមិនស្គាល់'}
                        </p>
                        {doc.size && (
                          <p className="text-xs text-gray-500">
                            ទំហំ: {(doc.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Officer Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BuildingOfficeIcon className="w-5 h-5 mr-2 text-blue-600" />
                  ព័ត៌មានមន្ត្រី
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      មន្ត្រីទទួលបន្ទុក
                    </label>
                    <p className="text-gray-900">
                      {application.portfolio_officer_name || 'មិនបានបញ្ជាក់'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ClockIcon className="w-5 h-5 mr-2 text-gray-600" />
                  ប្រវត្តិការណ៍
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">បង្កើតពាក្យសុំ</p>
                      <p className="text-xs text-gray-500">{formatDate(application.created_at)}</p>
                    </div>
                  </div>

                  {application.submitted_at && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">ដាក់ស្នើ</p>
                        <p className="text-xs text-gray-500">{formatDate(application.submitted_at)}</p>
                      </div>
                    </div>
                  )}

                  {application.approved_at && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">អនុម័ត</p>
                        <p className="text-xs text-gray-500">{formatDate(application.approved_at)}</p>
                      </div>
                    </div>
                  )}

                  {application.rejected_at && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">បដិសេធ</p>
                        <p className="text-xs text-gray-500">{formatDate(application.rejected_at)}</p>
                        {application.rejection_reason && (
                          <p className="text-xs text-gray-600 mt-1 bg-red-50 p-2 rounded">
                            មូលហេតុ: {application.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ស្ថិតិរហ័ស</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ស្ថានភាព</span>
                    <span className={`text-sm font-medium ${config.color.split(' ')[1]}`}>
                      {config.khmer}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ចំនួនឯកសារ</span>
                    <span className="text-sm font-medium text-gray-900">
                      {application.documents?.length || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ថ្ងៃកែប្រែចុងក្រោយ</span>
                    <span className="text-sm text-gray-900">
                      {formatDate(application.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                បដិសេធពាក្យសុំ
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  មូលហេតុបដិសេធ
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="សូមបញ្ជាក់មូលហេតុនៃការបដិសេធ..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'កំពុងបដិសេធ...' : 'បដិសេធ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}