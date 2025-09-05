'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useApplications, useDeleteApplication } from '@/hooks/useApplications';
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
  IdentificationIcon,
  Squares2X2Icon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CurrencyProvider, useFormatCurrency } from '@/contexts/CurrencyContext';
import Link from 'next/link';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useProductTypes } from '@/hooks/useEnums';

const statusConfig = {
  draft: { 
    label: 'ព្រាង', 
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', 
    icon: DocumentTextIcon,
    khmer: 'ព្រាង'
  },
  submitted: { 
    label: 'បានដាក់ស្នើ', 
    color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400', 
    icon: ClockIcon,
    khmer: 'បានដាក់ស្នើ'
  },
  pending: { 
    label: 'កំពុងរង់ចាំ', 
    color: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-400', 
    icon: ClockIcon,
    khmer: 'កំពុងរង់ចាំ'
  },
  under_review: { 
    label: 'កំពុងពិនិត្យ', 
    color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-400', 
    icon: ClockIcon,
    khmer: 'កំពុងពិនិត្យ'
  },
  approved: { 
    label: 'អនុម័ត', 
    color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400', 
    icon: CheckCircleIcon,
    khmer: 'អនុម័ត'
  },
  rejected: { 
    label: 'បដិសេធ', 
    color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400', 
    icon: XCircleIcon,
    khmer: 'បដិសេធ'
  }
}

function ApplicationsContent() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const formatCurrencyWithConversion = useFormatCurrency();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [applicationToDelete, setApplicationToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const productTypes = useProductTypes();

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

  const deleteApplicationMutation = useDeleteApplication();

  const applications = applicationsData?.items || [];
  const totalPages = applicationsData?.pages || 1;

  const handleDeleteClick = (application: any) => {
    setApplicationToDelete(application);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (applicationToDelete) {
      try {
        await deleteApplicationMutation.mutateAsync(applicationToDelete.id);
        setShowDeleteDialog(false);
        setApplicationToDelete(null);
      } catch (error) {
        // Error is handled by the mutation's onError callback
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setApplicationToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${config.color}`}>
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl">
                  <DocumentTextIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">ការគ្រប់គ្រងកម្ចីប្រាក់</h1>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    គ្រប់គ្រងនិងតាមដានពាក្យសុំកម្ចីរបស់អតិថិជន
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Squares2X2Icon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <ListBulletIcon className="w-5 h-5" />
                  </button>
                </div>
                <Link
                  href="/applications/new"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  <PlusIcon className="w-5 h-5 mr-3" />
                  បង្កើតពាក្យសុំថ្មី
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខអត្តសញ្ញាណ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="lg:w-56">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                className="inline-flex items-center px-6 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
                តម្រង
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      ចំនួនទឹកប្រាក់
                    </label>
                    <div className="flex space-x-4">
                      <input
                        type="number"
                        placeholder="ពី"
                        className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <input
                        type="number"
                        placeholder="ដល់"
                        className="flex-1 px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      កាលបរិច្ឆេទបង្កើត
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      មន្ត្រីទទួលបន្ទុក
                    </label>
                    <select className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
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
            <div className={`grid gap-8 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded-lg"></div>
                        <div className="h-3 bg-gray-200 rounded-lg w-5/6"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl w-fit mx-auto mb-6">
                <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">មិនមានពាក្យសុំកម្ចី</h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
                ចាប់ផ្តើមដោយការបង្កើតពាក្យសុំកម្ចីថ្មី
              </p>
              <div>
                <Link
                  href="/applications/new"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <PlusIcon className="w-5 h-5 mr-3" />
                  បង្កើតពាក្យសុំថ្មី
                </Link>
              </div>
            </div>
          ) : (
            <div className={`grid gap-8 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {applications.map((application) => (
                <div key={application.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600 group overflow-hidden ${
                  viewMode === 'list' ? 'flex items-center space-x-6 p-6' : 'p-0'
                }`}>
                  {/* Header */}
                  <div className={`${viewMode === 'list' ? '' : 'px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600'}`}>
                    <div className={`flex items-start justify-between ${viewMode === 'list' ? 'flex-1 mb-4' : 'mb-0'}`}>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:scale-110 transition-transform duration-200">
                          <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {application.full_name_khmer || application.full_name_latin || 'មិនបានបញ្ជាក់ឈ្មោះ'}
                          </h3>
                          {application.full_name_khmer && application.full_name_latin && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{application.full_name_latin}</p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`${viewMode === 'list' ? '' : 'p-6'}`}>

                    {/* Customer Info */}
                    <div className={`space-y-3 mb-6 ${viewMode === 'list' ? 'flex-1 grid grid-cols-2 gap-4' : ''}`}>
                      {application.id_number && (
                        <div className="flex items-center text-sm">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                            <IdentificationIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{application.id_card_type}</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{application.id_number}</p>
                          </div>
                        </div>
                      )}
                      {application.phone && (
                        <div className="flex items-center text-sm">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg mr-3">
                            <PhoneIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">លេខទូរស័ព្ទ</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{application.phone}</p>
                          </div>
                        </div>
                      )}
                      {application.portfolio_officer_name && (
                        <div className="flex items-center text-sm">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
                            <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">មន្ត្រីទទួលបន្ទុក</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{application.portfolio_officer_name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Loan Details */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ចំនួនទឹកប្រាក់</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {application.requested_amount 
                              ? formatCurrencyWithConversion(application.requested_amount, 'KHR')
                              : 'មិនបានបញ្ជាក់'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ផលិតផល</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {productTypes.getLabel(application.product_type) || 'មិនបានបញ្ជាក់'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">គោលបំណង</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {getLoanPurposeText(application.loan_purposes)}
                        </p>
                      </div>
                    </div>

                    {/* Guarantor Info */}
                    {application.guarantor_name && (
                      <div className="mb-6">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">អ្នកធានា</p>
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <UserIcon className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                          {application.guarantor_name}
                          {application.guarantor_phone && (
                            <span className="ml-2 text-gray-600 dark:text-gray-400">({application.guarantor_phone})</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        បង្កើត: {formatDate(application.created_at)}
                      </div>
                      {application.submitted_at && (
                        <div className="flex items-center mt-2">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          ដាក់ស្នើ: {formatDate(application.submitted_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`${viewMode === 'list' ? 'flex space-x-3 flex-shrink-0' : 'px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-xl border-t border-gray-200 dark:border-gray-600'}`}>
                    <div className={`flex items-center ${viewMode === 'list' ? 'space-x-3' : 'justify-between'}`}>
                      <div className="flex space-x-3">
                        <Link
                          href={`/applications/${application.id}`}
                          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                          <EyeIcon className="w-4 h-4 mr-2" />
                          មើល
                        </Link>
                        {(user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id) && (
                          <Link
                            href={`/applications/${application.id}/edit`}
                            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                          >
                            <PencilIcon className="w-4 h-4 mr-2" />
                            កែប្រែ
                          </Link>
                        )}
                        {/* Delete button - only for draft applications */}
                        {application.status === 'draft' && (user?.role === 'admin' || user?.role === 'manager' || application.user_id === user?.id) && (
                          <button
                            onClick={() => handleDeleteClick(application)}
                            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            disabled={deleteApplicationMutation.isPending}
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            លុប
                          </button>
                        )}
                      </div>
                      
                      {/* Document count */}
                      {application.documents && application.documents.length > 0 && viewMode === 'grid' && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-500">
                          <DocumentDuplicateIcon className="w-4 h-4 mr-1.5" />
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
          {!isLoading && applications && applications.length > 0 && totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 font-medium">
                  បង្ហាញ <span className="font-semibold text-gray-900">{((page - 1) * 10) + 1}</span> ដល់ <span className="font-semibold text-gray-900">{Math.min(page * 10, applicationsData?.total || 0)}</span> នៃ <span className="font-semibold text-gray-900">{applicationsData?.total || 0}</span> ពាក្យសុំ
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                  >
                    មុន
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                          page === pageNum
                            ? 'text-white bg-blue-600 shadow-lg'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:shadow-md'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                  >
                    បន្ទាប់
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="លុបពាក្យសុំព្រាង"
          message={`តើអ្នកពិតជាចង់លុបពាក្យសុំព្រាងរបស់ ${applicationToDelete?.full_name_khmer || applicationToDelete?.full_name_latin || 'អតិថិជននេះ'} មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`}
          confirmText="លុប"
          cancelText="បោះបង់"
          type="danger"
          isLoading={deleteApplicationMutation.isPending}
        />
      </Layout>
    </ProtectedRoute>
  );
}

export default function ApplicationsPage() {
  return (
    <CurrencyProvider>
      <ApplicationsContent />
    </CurrencyProvider>
  );
}