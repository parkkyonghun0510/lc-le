'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplications } from '@/hooks/useApplications';
import { useAuth } from '@/hooks/useAuth';
import { 
  DocumentTextIcon, 
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  PhoneIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

const statusConfig = {
  draft: { 
    label: 'ព្រាង', 
    color: 'bg-gray-100 text-gray-800', 
    icon: DocumentTextIcon,
    khmer: 'ព្រាង'
  },
  submitted: { 
    label: 'បានដាក់ស្នើ', 
    color: 'bg-blue-100 text-blue-800', 
    icon: ClockIcon,
    khmer: 'បានដាក់ស្នើ'
  },
  pending: { 
    label: 'កំពុងរង់ចាំ', 
    color: 'bg-orange-100 text-orange-800', 
    icon: ClockIcon,
    khmer: 'កំពុងរង់ចាំ'
  },
  under_review: { 
    label: 'កំពុងពិនិត្យ', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: ClockIcon,
    khmer: 'កំពុងពិនិត្យ'
  },
  approved: { 
    label: 'អនុម័ត', 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircleIcon,
    khmer: 'អនុម័ត'
  },
  rejected: { 
    label: 'បដិសេធ', 
    color: 'bg-red-100 text-red-800', 
    icon: XCircleIcon,
    khmer: 'បដិសេធ'
  }
};

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { 
    data: applicationsData, 
    isLoading, 
    error 
  } = useApplications({
    search: searchTerm,
    status: statusFilter,
    page,
    size: 10
  });

  const applications = applicationsData?.items || [];
  const totalPages = applicationsData?.pages || 1;

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.khmer}
      </span>
    );
  };

  const getLoanPurposeText = (purposes: string[] | null | undefined) => {
    if (!purposes || purposes.length === 0) return 'មិនបានបញ្ជាក់';
    
    const purposeMap: { [key: string]: string } = {
      'business': 'អាជីវកម្ម',
      'agriculture': 'កសិកម្ម',
      'education': 'អប់រំ',
      'housing': 'លំនៅដ្ឋាន',
      'vehicle': 'យានយន្ត',
      'medical': 'វេជ្ជសាស្ត្រ',
      'other': 'ផ្សេងៗ'
    };
    
    return purposes.map(p => purposeMap[p] || p).join(', ');
  };

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-2">មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ</h2>
            <p className="text-gray-600">សូមព្យាយាមម្តងទៀត</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ការគ្រប់គ្រងកម្ចីប្រាក់</h1>
              <p className="text-gray-600 mt-1">
                គ្រប់គ្រងនិងតាមដានពាក្យសុំកម្ចីរបស់អតិថិជន
              </p>
            </div>
            <Link
              href="/applications/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              បង្កើតពាក្យសុំថ្មី
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខអត្តសញ្ញាណ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">ស្ថានភាពទាំងអស់</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.khmer}</option>
                  ))}
                </select>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FunnelIcon className="w-5 h-5 mr-2" />
                តម្រង
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ចំនួនទឹកប្រាក់
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="ពី"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="ដល់"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      កាលបរិច្ឆេទបង្កើត
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      មន្ត្រីទទួលបន្ទុក
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">ទាំងអស់</option>
                      {/* Add officer options */}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Applications Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">មិនមានពាក្យសុំកម្ចី</h3>
              <p className="mt-1 text-sm text-gray-500">
                ចាប់ផ្តើមដោយការបង្កើតពាក្យសុំកម្ចីថ្មី
              </p>
              <div className="mt-6">
                <Link
                  href="/applications/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  បង្កើតពាក្យសុំថ្មី
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {applications.map((application) => (
                <div key={application.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {application.full_name_khmer || application.full_name_latin || 'មិនបានបញ្ជាក់ឈ្មោះ'}
                        </h3>
                        {application.full_name_khmer && application.full_name_latin && (
                          <p className="text-sm text-gray-600">{application.full_name_latin}</p>
                        )}
                      </div>
                      {getStatusBadge(application.status)}
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2 mb-4">
                      {application.id_number && (
                        <div className="flex items-center text-sm text-gray-600">
                          <IdentificationIcon className="w-4 h-4 mr-2 text-gray-400" />
                          {application.id_card_type}: {application.id_number}
                        </div>
                      )}
                      {application.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                          {application.phone}
                        </div>
                      )}
                      {application.portfolio_officer_name && (
                        <div className="flex items-center text-sm text-gray-600">
                          <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                          មន្ត្រី: {application.portfolio_officer_name}
                        </div>
                      )}
                    </div>

                    {/* Loan Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">ចំនួនទឹកប្រាក់</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {application.requested_amount 
                              ? formatCurrency(application.requested_amount)
                              : 'មិនបានបញ្ជាក់'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">រយៈពេល</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {application.desired_loan_term || 'មិនបានបញ្ជាក់'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">គោលបំណង</p>
                        <p className="text-sm text-gray-900">
                          {getLoanPurposeText(application.loan_purposes)}
                        </p>
                      </div>
                    </div>

                    {/* Guarantor Info */}
                    {application.guarantor_name && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">អ្នកធានា</p>
                        <div className="flex items-center text-sm text-gray-900">
                          <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                          {application.guarantor_name}
                          {application.guarantor_phone && (
                            <span className="ml-2 text-gray-600">({application.guarantor_phone})</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="text-xs text-gray-500 mb-4">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        បង្កើត: {formatDate(application.created_at)}
                      </div>
                      {application.submitted_at && (
                        <div className="flex items-center mt-1">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          ដាក់ស្នើ: {formatDate(application.submitted_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Link
                          href={`/applications/${application.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          មើល
                        </Link>
                        {(user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id) && (
                          <Link
                            href={`/applications/${application.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            កែប្រែ
                          </Link>
                        )}
                      </div>
                      
                      {/* Document count */}
                      {application.documents && application.documents.length > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                          {application.documents.length} ឯកសារ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-6 py-3 rounded-lg shadow">
              <div className="flex items-center text-sm text-gray-700">
                បង្ហាញ {((page - 1) * 10) + 1} ដល់ {Math.min(page * 10, applicationsData?.total || 0)} នៃ {applicationsData?.total || 0} ពាក្យសុំ
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  មុន
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        page === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  បន្ទាប់
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}